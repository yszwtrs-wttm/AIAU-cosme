-- IDF は「その成分がどれだけ珍しいか」なので、商品が増えるたびに変わる。
-- refresh_ingredient_idf() を呼ぶ仕組みが無いと古い重みのまま類似度がずれるので、
-- Supabase Cron (pg_cron) で日次実行し、実行ログを maintenance_runs に残す。
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- ---------------------------------------------------------------- maintenance_runs
-- 定期処理の実行ログ。最終更新時刻と所要時間を見るために残す。
create table if not exists maintenance_runs (
  id          bigserial primary key,
  job         text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int,
  products    int,
  ingredients int,
  status      text not null default 'running',
  detail      text
);

do $$
begin
  alter table maintenance_runs add constraint maintenance_runs_status_check
    check (status in ('running', 'success', 'error'));
exception
  when duplicate_object then null;
end
$$;

create index if not exists maintenance_runs_job_started_idx
  on maintenance_runs (job, started_at desc);

alter table maintenance_runs enable row level security;

-- 集計の鮮度は隠す情報ではないので誰でも読める。書き込みは cron（関数の所有者）だけ。
drop policy if exists "maintenance runs readable" on maintenance_runs;
create policy "maintenance runs readable" on maintenance_runs
  for select using (true);

-- ---------------------------------------------------------------- 実行用ラッパ
-- refresh_ingredient_idf() を呼び、開始・終了・所要時間・対象件数を記録する。
-- 例外はログに残して飲み込む（cron のジョブ自体を失敗させても記録が残らないため）。
create or replace function refresh_ingredient_idf_logged()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      bigint;
  v_started timestamptz := clock_timestamp();
begin
  insert into maintenance_runs (job) values ('refresh_ingredient_idf')
  returning id into v_id;

  begin
    perform refresh_ingredient_idf();
  exception
    when others then
      update maintenance_runs
      set finished_at = now(),
          duration_ms = (extract(epoch from clock_timestamp() - v_started) * 1000)::int,
          status = 'error',
          detail = sqlerrm
      where id = v_id;
      raise warning 'refresh_ingredient_idf failed: %', sqlerrm;
      return v_id;
  end;

  update maintenance_runs
  set finished_at = now(),
      duration_ms = (extract(epoch from clock_timestamp() - v_started) * 1000)::int,
      products = (select count(*) from products),
      ingredients = (select count(*) from ingredients_master where df > 0),
      status = 'success'
  where id = v_id;

  return v_id;
end;
$$;

revoke all on function refresh_ingredient_idf_logged() from public;

-- 最終実行の確認用。README / SQL Editor から `select * from ingredient_idf_status;` で見る。
create or replace view ingredient_idf_status
with (security_invoker = true) as
select started_at, finished_at, duration_ms, products, ingredients, status, detail
from maintenance_runs
where job = 'refresh_ingredient_idf'
order by started_at desc
limit 1;

-- ---------------------------------------------------------------- スケジュール
-- 毎日 18:00 UTC（JST 3:00）。同名ジョブは上書きされるので再適用しても増えない。
select cron.schedule(
  'refresh-ingredient-idf',
  '0 18 * * *',
  $$select public.refresh_ingredient_idf_logged();$$
);
