#!/usr/bin/env python3
"""シードデータのシナリオ検証スモーク。

投入済みのシードに対して「被りが出る商品」「安い代替が出る商品」「サクラ除外が
起きる商品」が実際に存在するかを Postgres 側の関数越しに確かめ、主要クエリの
実行時間も一緒に記録する。1件でも落ちたら終了コードは 1。

    npm run db:reset
    python3 scripts/smoke_scenarios.py
    python3 scripts/smoke_scenarios.py --json smoke.json

大規模セットで測る場合は、生成したシードを投入してから検証できる。

    python3 scripts/generate_seed.py --scale large > supabase/seed.large.sql
    python3 scripts/smoke_scenarios.py --seed-file supabase/seed.large.sql

接続先は SUPABASE_DB_URL（既定 postgresql://postgres:postgres@127.0.0.1:54322/postgres）。
psql が無い場合は supabase の DB コンテナ内の psql を docker exec で使う。
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
TEST_USER = "00000000-0000-0000-0000-00000000dead"
JSON_MARKER = "-- SMOKE_JSON"

SETUP_SQL = """
create temp table smoke_results (
  seq serial, name text, required boolean, ok boolean, detail text, ms numeric
);

-- 手持ち依存の関数（find_stash_overlaps など）を試すためのユーザー
insert into auth.users (id, instance_id, aud, role, email)
values ('{user}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'smoke@example.invalid')
on conflict (id) do nothing;

do $$
begin
  perform set_config('request.jwt.claims',
                     '{{"sub": "{user}", "role": "authenticated"}}', false);
end $$;

delete from user_items where user_id = '{user}';

-- 各カテゴリの高い商品とその「安い代替」を手持ちに入れる。
-- これで手持ちの中に被りがある状態を作る。
with ranked as (
  select id, category, row_number() over (partition by category order by price_yen desc) as rn
  from products
), pairs as (
  select r.id as expensive, d.product_id as cheap
  from ranked r
  cross join lateral (select product_id from find_cheaper_dupes(r.id, 1)) d
  where r.rn <= 3
)
insert into user_items (user_id, product_id)
select '{user}', id
from (select expensive as id from pairs union select cheap as id from pairs) t
on conflict (user_id, product_id) do nothing;
""".format(user=TEST_USER)

# (name, required, sql)
# sql は「select <ok boolean>, <detail text> into v_ok, v_detail ...」の形。
CHECKS = [
    ("seed_size", True, """
      select (select count(*) from products) > 0,
             format('商品 %s / ブランド %s / 色 %s / 口コミ %s',
                    (select count(*) from products), (select count(*) from brands),
                    (select count(*) from product_colors), (select count(*) from reviews))
    """),
    ("手持ちの中に被りがある", True, """
      select count(*) > 0,
             format('%s 組 (最大 score %s, 例: %s / %s)', count(*),
                    round(max(score)::numeric, 3), min(a_label), min(b_label))
      from find_stash_overlaps(0.6)
    """),
    ("買う前の商品に手持ちの被りが出る", True, """
      select count(*) > 0,
             format('%s 件 (最大 score %s)', count(*), round(max(d.score)::numeric, 3))
      from (
        select p.id from products p
        where exists (select 1 from user_items ui where ui.product_id = p.id)
        order by p.price_yen desc limit 1
      ) t
      cross join lateral (select * from find_duplicates_in_stash(t.id, 0.5)) d
    """),
    ("安い代替が出る商品がある", True, """
      select count(distinct t.id) > 0,
             format('%s 商品に代替あり (最大 %s 円安い)', count(distinct t.id), max(d.savings))
      from (
        select id from products order by price_yen desc limit 12
      ) t
      cross join lateral (select * from find_cheaper_dupes(t.id, 3)) d
    """),
    ("パレットの色が手持ちで再現できる", True, """
      select count(*) > 0,
             format('%s 色が手持ちと ΔE<=5', count(*))
      from (
        select id from products where category = 'eyeshadow' order by price_yen desc limit 1
      ) t
      cross join lateral (select * from find_palette_coverage(t.id, 5)) c
      where c.owned_product_id is not null
    """),
    ("サクラ除外が起きる商品がある", True, """
      select count(*) > 0,
             format('%s 商品 / 除外 %s 件', count(*), sum(excluded_count))
      from product_rating_summary
      where excluded_count > 0
    """),
    ("除外の理由が付いている", True, """
      select count(*) > 0, format('理由: %s', string_agg(distinct f, ', '))
      from reviews r, unnest(r.flags) f
      where r.excluded
    """),
    ("普通の口コミは除外されない", True, """
      select count(*) filter (where not excluded) * 2 > count(*),
             format('残 %s / 除外 %s', count(*) filter (where not excluded),
                    count(*) filter (where excluded))
      from reviews
    """),
    ("補正後の評価がサクラ商品で下がる", True, """
      select count(*) > 0,
             format('%s 商品で raw > adjusted', count(*))
      from product_rating_summary
      where excluded_count > 0 and adjusted_rating is not null and adjusted_rating < raw_rating
    """),
    ("色から探す (find_by_color)", True, """
      select count(*) > 0, format('%s 件 (最小 ΔE %s)', count(*), round(min(delta_e)::numeric, 2))
      from find_by_color(array[55, 30, 20]::double precision[], null, 8)
    """),
    ("一覧のランキング (product_score 全件)", True, """
      select count(*) > 0, format('%s 行', count(*)) from product_score
    """),
    ("不正判定の再計算 (1商品)", True, """
      select true, format('product_id=%s', t.id)
      from (
        select p.id from products p
        join reviews r on r.product_id = p.id
        group by p.id order by count(*) desc limit 1
      ) t, lateral (select recompute_review_trust(t.id)) x
    """),
]

CHECK_TEMPLATE = """
do $$
declare
  t0 timestamptz := clock_timestamp();
  v_ok boolean;
  v_detail text;
begin
  select chk.ok, chk.detail into v_ok, v_detail from ({sql}) chk(ok, detail);
  insert into smoke_results (name, required, ok, detail, ms)
  values ($n${name}$n$, {required}, coalesce(v_ok, false), coalesce(v_detail, ''),
          round((extract(epoch from clock_timestamp() - t0) * 1000)::numeric, 1));
end $$;
"""

REPORT_SQL = """
\\pset format aligned
select seq as "#", name as "シナリオ", case when ok then 'ok' else 'NG' end as "結果",
       detail as "内容", ms as "ms"
from smoke_results order by seq;

\\echo {marker}
\\copy (select coalesce(json_agg(json_build_object('name', name, 'ok', ok, 'detail', detail, 'ms', ms) order by seq), '[]') from smoke_results) to stdout

do $$
declare n int;
begin
  select count(*) into n from smoke_results where required and not ok;
  if n > 0 then
    raise exception '% 件のシナリオ検証が失敗しました', n;
  end if;
end $$;
""".format(marker=JSON_MARKER)


def build_sql():
    parts = [SETUP_SQL]
    for name, required, sql in CHECKS:
        parts.append(CHECK_TEMPLATE.format(
            sql=sql.strip().rstrip(";"), name=name,
            required="true" if required else "false"))
    parts.append(REPORT_SQL)
    return "\n".join(parts)


def project_id():
    config = (REPO_ROOT / "supabase" / "config.toml").read_text(encoding="utf-8")
    match = re.search(r'^project_id\s*=\s*"([^"]+)"', config, re.M)
    return match.group(1) if match else "AIAU-cosme"


def psql_command():
    url = os.environ.get("SUPABASE_DB_URL", DEFAULT_DB_URL)
    if shutil.which("psql"):
        return ["psql", "-v", "ON_ERROR_STOP=1", "-X", "-q", url]
    # ローカルに psql が無い環境では supabase の DB コンテナのものを使う
    return ["docker", "exec", "-i", "supabase_db_%s" % project_id(),
            "psql", "-v", "ON_ERROR_STOP=1", "-X", "-q", "-U", "postgres", "-d", "postgres"]


def load_seed(path):
    """シードを投入して所要時間を出す。"""
    started = time.perf_counter()
    proc = subprocess.run(psql_command(), input=path.read_text(encoding="utf-8"),
                          capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stderr.strip(), file=sys.stderr)
        print("シードの投入に失敗しました: %s" % path, file=sys.stderr)
        return False
    print("シード投入: %s (%.1f 秒)\n" % (path, time.perf_counter() - started))
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--json", dest="json_path",
                        help="結果と実行時間を JSON で書き出す")
    parser.add_argument("--seed-file",
                        help="検証前にこの SQL を投入する（大規模セットの検証に使う）")
    parser.add_argument("--print-sql", action="store_true", help="実行する SQL を出すだけ")
    args = parser.parse_args()

    if args.seed_file:
        if not load_seed(Path(args.seed_file)):
            return 1

    sql = build_sql()
    if args.print_sql:
        print(sql)
        return 0

    proc = subprocess.run(psql_command(), input=sql, capture_output=True, text=True)
    report, _, payload = proc.stdout.partition(JSON_MARKER + "\n")
    print(report.strip())
    if proc.stderr.strip():
        print(proc.stderr.strip(), file=sys.stderr)
    if args.json_path and payload.strip():
        Path(args.json_path).write_text(payload.strip().splitlines()[0] + "\n", encoding="utf-8")
        print("\nJSON: %s" % args.json_path)
    if proc.returncode != 0:
        print("\nシナリオ検証に失敗しました", file=sys.stderr)
        return 1
    print("\nすべてのシナリオ検証を通過しました")
    return 0


if __name__ == "__main__":
    sys.exit(main())
