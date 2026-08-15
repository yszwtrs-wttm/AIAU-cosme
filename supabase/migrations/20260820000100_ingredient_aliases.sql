-- 成分名の表記ゆれ・同義語を正規化する。
--
-- 成分ベクトルの精度は「その文字列が成分マスタのどの行なのか当てられるか」で決まる。
-- 全成分表示は INCI（英語）だが、実際に入ってくる文字列は日本語表示名（トコフェロール）、
-- 慣用名（ビタミンE）、全角・記号・空白の揺れ（ヒアルロン酸Ｎａ / CI77491）が混ざる。
--   * ingredient_aliases: 別名 → 正規の成分ID。INCI・日本語名・慣用名を1つの辞書に集める。
--   * resolve_ingredient_id(): 正規化キーの完全一致 → pg_trgm のあいまい一致の順に引き当てる。
--   * unresolved_ingredients: 引き当てられなかった成分名の一覧。辞書を育てるための入口。

-- ---------------------------------------------------------------- 正規化キー
-- 全角英数を半角に落とし、小文字化し、かなをカタカナ（大文字）に寄せて、区切り記号と空白を捨てる。
-- 「CI 77491」「ci77491」「ＣＩ77491」、「トコフェロール」「とこふえろーる」を同じキーにするのが目的。
create or replace function normalize_ingredient_name(p_name text)
returns text
language sql
immutable
as $$
  select nullif(
    translate(
      lower(
        -- ひらがな→カタカナ、小さいカナ→大きいカナ。「ェ」と「エ」の揺れを潰す。
        translate(
          translate(
            btrim(coalesce(p_name, '')),
            'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９',
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
          ),
          'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖァィゥェォヵヶッャュョヮ',
          'アアイイウウエエオオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂツツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤヤユユヨヨラリルレロワワヰヱヲンヴカケアイウエオカケツヤユヨワ'
        )
      ),
      E' \t\u3000-_.,;:/\\()[]{}<>|*+"''`~!?#$%&=^\u30fc\u30fb\uff08\uff09\uff0f\uff0d\u2010\u2011\u2012\u2013\u2014\u2015\uff0c\u3001\u3002\uff1a\uff1b\u300c\u300d\u2018\u2019\u201c\u201d\uff05\uff0b',
      ''
    ),
    ''
  )
$$;

-- ---------------------------------------------------------------- 辞書
create table if not exists ingredient_aliases (
  id            bigint generated always as identity primary key,
  ingredient_id bigint not null references ingredients_master(id) on delete cascade,
  alias         text not null,
  -- 引き当てに使うキー。表記ゆれを落とした形で持つ。
  alias_norm    text generated always as (normalize_ingredient_name(alias)) stored,
  kind          text not null default 'common' check (kind in ('inci', 'ja', 'common')),
  created_at    timestamptz not null default now()
);

-- 1つの別名が2つの成分を指すと正規化できないので、キーは全体で一意にする。
create unique index if not exists ingredient_aliases_norm_key on ingredient_aliases (alias_norm);
create index if not exists ingredient_aliases_ingredient_idx on ingredient_aliases (ingredient_id);
create index if not exists ingredient_aliases_trgm_idx on ingredient_aliases using gin (alias_norm gin_trgm_ops);

alter table ingredient_aliases enable row level security;

drop policy if exists "ingredient aliases readable" on ingredient_aliases;
create policy "ingredient aliases readable" on ingredient_aliases for select using (true);

-- 成分マスタの INCI と日本語名は、辞書に入っていないと引き当てられない。行を足したら自動で追随させる。
create or replace function trg_ingredients_master_aliases()
returns trigger
language plpgsql
as $$
begin
  insert into ingredient_aliases (ingredient_id, alias, kind)
  values (new.id, new.inci, 'inci')
  on conflict (alias_norm) do nothing;

  if coalesce(btrim(new.name_ja), '') <> '' then
    insert into ingredient_aliases (ingredient_id, alias, kind)
    values (new.id, new.name_ja, 'ja')
    on conflict (alias_norm) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists ingredients_master_aliases on ingredients_master;
create trigger ingredients_master_aliases
after insert or update of inci, name_ja on ingredients_master
for each row execute function trg_ingredients_master_aliases();

-- ---------------------------------------------------------------- 引き当て
-- 完全一致（正規化キー）を最優先。無ければ pg_trgm の類似度で拾う。
-- 閾値を下げすぎると別の成分に吸い込まれるので、既定は 0.72 と高めに置く。
create or replace function resolve_ingredient_id(p_name text, p_min_similarity double precision default 0.72)
returns bigint
language sql
stable
as $$
  with norm as (
    select normalize_ingredient_name(p_name) as key
  )
  select ingredient_id
  from (
    select a.ingredient_id, 2 as priority, 1::double precision as sim
    from ingredient_aliases a, norm
    where norm.key is not null and a.alias_norm = norm.key
    union all
    select a.ingredient_id, 1 as priority, similarity(a.alias_norm, norm.key) as sim
    from ingredient_aliases a, norm
    where norm.key is not null
      and length(norm.key) >= 5
      and similarity(a.alias_norm, norm.key) >= p_min_similarity
  ) hit
  order by priority desc, sim desc, ingredient_id
  limit 1;
$$;

-- 引き当て結果を成分マスタごと返す。UI からも使えるようにしておく。
create or replace function resolve_ingredient(p_name text)
returns table (input text, ingredient_id bigint, inci text, name_ja text, matched_alias text, matched_kind text)
language sql
stable
as $$
  select p_name,
         im.id,
         im.inci,
         im.name_ja,
         a.alias,
         a.kind
  from ingredients_master im
  left join ingredient_aliases a
    on a.ingredient_id = im.id
   and a.alias_norm = normalize_ingredient_name(p_name)
  where im.id = resolve_ingredient_id(p_name);
$$;

-- ---------------------------------------------------------------- 成分ベクトル
-- 文字列一致をやめて、辞書経由で dim を引く。別名で書かれていても同じ次元に載る。
create or replace function build_ingredient_vec(p_ingredients text[])
returns vector(256)
language plpgsql
stable
as $$
declare
  acc double precision[] := array_fill(0::double precision, array[256]);
  i int;
  d int;
  f double precision;
  w double precision;
  norm double precision := 0;
  parts text[] := '{}';
begin
  if p_ingredients is null then
    return null;
  end if;

  for i in 1 .. array_length(p_ingredients, 1) loop
    select im.dim, im.idf into d, f
    from ingredients_master im
    where im.id = resolve_ingredient_id(p_ingredients[i]);

    if d is not null then
      -- 配合順の重み（全成分表示は配合量の多い順）× IDF
      w := (1.0 / (ln(i + 1) / ln(2.0))) * coalesce(f, 1);
      acc[d] := acc[d] + w;
    end if;
  end loop;

  for i in 1 .. 256 loop
    norm := norm + acc[i] * acc[i];
  end loop;
  norm := sqrt(norm);
  if norm = 0 then
    norm := 1;
  end if;

  for i in 1 .. 256 loop
    parts := parts || to_char(acc[i] / norm, 'FM0.000000');
  end loop;

  return ('[' || array_to_string(parts, ',') || ']')::vector(256);
end;
$$;

-- DF も別名を同一視して数える。表記が違うだけで別成分に見えると IDF が壊れる。
create or replace function refresh_ingredient_idf()
returns void
language plpgsql
as $$
declare
  total int;
begin
  select count(*) into total from products;
  if total = 0 then
    return;
  end if;

  with resolved as (
    select distinct p.id as product_id, resolve_ingredient_id(ing) as ingredient_id
    from products p
    cross join unnest(p.ingredients) as ing
  ),
  counts as (
    select ingredient_id, count(*) as df
    from resolved
    where ingredient_id is not null
    group by ingredient_id
  )
  update ingredients_master im
  set df = coalesce(c.df, 0),
      idf = ln(1 + total::double precision / (1 + coalesce(c.df, 0)))
  from ingredients_master im2
  left join counts c on c.ingredient_id = im2.id
  where im.id = im2.id;

  update products set ingredient_vec = build_ingredient_vec(ingredients);
end;
$$;

-- ---------------------------------------------------------------- 辞書の投入
-- 成分マスタの INCI / 日本語名に加えて、日本語表示名と慣用名（旧称・略称）を入れる。
-- 手で足した別名は on conflict do nothing で残るので、何度呼んでもよい。
create or replace function seed_ingredient_aliases()
returns int
language plpgsql
as $$
declare
  added int := 0;
  n int;
begin
  insert into ingredient_aliases (ingredient_id, alias, kind)
  select im.id, im.inci, 'inci' from ingredients_master im
  on conflict (alias_norm) do nothing;
  get diagnostics n = row_count;
  added := added + n;

  insert into ingredient_aliases (ingredient_id, alias, kind)
  select im.id, im.name_ja, 'ja' from ingredients_master im
  where coalesce(btrim(im.name_ja), '') <> ''
  on conflict (alias_norm) do nothing;
  get diagnostics n = row_count;
  added := added + n;

  -- 日本語表示名・慣用名。src/lib/ingredients.ts の辞書と同じ内容を DB 側にも持たせる。
  insert into ingredient_aliases (ingredient_id, alias, kind)
  select im.id, seed.alias, 'common'
  from (values
    ('WATER', '水'),
    ('GLYCERIN', 'グリセリン'),
    ('BUTYLENE GLYCOL', 'BG（ブチレングリコール）'),
    ('BUTYLENE GLYCOL', 'BG'),
    ('BUTYLENE GLYCOL', 'ブチレングリコール'),
    ('SQUALANE', 'スクワラン'),
    ('CAPRYLIC/CAPRIC TRIGLYCERIDE', '中鎖脂肪酸トリグリセリド'),
    ('HYDROGENATED POLYISOBUTENE', '水添ポリイソブテン'),
    ('DIISOSTEARYL MALATE', 'リンゴ酸ジイソステアリル'),
    ('OCTYLDODECANOL', 'オクチルドデカノール'),
    ('ISOPROPYL MYRISTATE', 'ミリスチン酸イソプロピル'),
    ('RICINUS COMMUNIS SEED OIL', 'ヒマシ油'),
    ('SIMMONDSIA CHINENSIS SEED OIL', 'ホホバ種子油'),
    ('ARGANIA SPINOSA KERNEL OIL', 'アルガンオイル'),
    ('JOJOBA ESTERS', 'ホホバエステル'),
    ('SHEA BUTTER ETHYL ESTERS', 'シアバターエチルエステル'),
    ('POLYGLYCERYL-2 TRIISOSTEARATE', 'トリイソステアリン酸ポリグリセリル-2'),
    ('PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE', 'ラウロイルグルタミン酸ジ（フィトステリル/オクチルドデシル）'),
    ('PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE', 'ラウロイルグルタミン酸ジ'),
    ('CERA ALBA', 'ミツロウ'),
    ('CANDELILLA WAX', 'キャンデリラロウ'),
    ('MICROCRYSTALLINE WAX', 'マイクロクリスタリンワックス'),
    ('POLYETHYLENE', 'ポリエチレン'),
    ('CETEARYL ALCOHOL', 'セテアリルアルコール'),
    ('STEARYL ALCOHOL', 'ステアリルアルコール'),
    ('GLYCOL DISTEARATE', 'ジステアリン酸グリコール'),
    ('DIMETHICONE', 'ジメチコン'),
    ('METHICONE', 'メチコン'),
    ('CYCLOPENTASILOXANE', 'シクロペンタシロキサン'),
    ('ISODODECANE', 'イソドデカン'),
    ('TRIMETHYLSILOXYSILICATE', 'トリメチルシロキシケイ酸'),
    ('PEG-10 DIMETHICONE', 'PEG-10ジメチコン'),
    ('LAURYL PEG-9 POLYDIMETHYLSILOXYETHYL DIMETHICONE', 'ラウリルPEG-9ポリジメチルシロキシエチルジメチコン'),
    ('AMODIMETHICONE', 'アモジメチコン'),
    ('TRIETHOXYCAPRYLYLSILANE', 'トリエトキシカプリリルシラン'),
    ('DISTEARDIMONIUM HECTORITE', 'ジステアルジモニウムヘクトライト'),
    ('TALC', 'タルク'),
    ('MICA', 'マイカ（雲母）'),
    ('MICA', 'マイカ'),
    ('MICA', '雲母'),
    ('SYNTHETIC FLUORPHLOGOPITE', '合成フルオロフロゴパイト'),
    ('SILICA', 'シリカ'),
    ('BORON NITRIDE', '窒化ホウ素'),
    ('ZINC STEARATE', 'ステアリン酸亜鉛'),
    ('MAGNESIUM MYRISTATE', 'ミリスチン酸マグネシウム'),
    ('ALUMINUM HYDROXIDE', '水酸化アルミニウム'),
    ('CALCIUM ALUMINUM BOROSILICATE', 'ホウケイ酸（Ca/Al）'),
    ('CALCIUM ALUMINUM BOROSILICATE', 'ホウケイ酸'),
    ('TIN OXIDE', '酸化スズ'),
    ('TITANIUM DIOXIDE', '酸化チタン'),
    ('ZINC OXIDE', '酸化亜鉛'),
    ('IRON OXIDES', '酸化鉄'),
    ('CI 77491', '赤色酸化鉄'),
    ('CI 77492', '黄色酸化鉄'),
    ('CI 77499', '黒色酸化鉄'),
    ('CI 15850', '赤色202号'),
    ('CI 45410', '赤色223号'),
    ('CI 19140', '黄色4号'),
    ('CI 42090', '青色1号'),
    ('NIACINAMIDE', 'ナイアシンアミド'),
    ('ASCORBYL GLUCOSIDE', 'アスコルビルグルコシド'),
    ('PANTHENOL', 'パンテノール'),
    ('SALICYLIC ACID', 'サリチル酸'),
    ('PIROCTONE OLAMINE', 'ピロクトンオラミン'),
    ('ZINC PYRITHIONE', 'ジンクピリチオン'),
    ('ISOPROPYL METHYLPHENOL', 'イソプロピルメチルフェノール'),
    ('BIOTIN', 'ビオチン'),
    ('HYDROLYZED KERATIN', '加水分解ケラチン'),
    ('CAMELLIA SINENSIS LEAF EXTRACT', 'チャ葉エキス'),
    ('HYALURONIC ACID', 'ヒアルロン酸'),
    ('SODIUM HYALURONATE', 'ヒアルロン酸Na'),
    ('TOCOPHERYL ACETATE', '酢酸トコフェロール（ビタミンE）'),
    ('TOCOPHERYL ACETATE', '酢酸トコフェロール'),
    ('SODIUM LAURETH SULFATE', 'ラウレス硫酸Na'),
    ('COCAMIDOPROPYL BETAINE', 'コカミドプロピルベタイン'),
    ('LAURAMIDOPROPYL BETAINE', 'ラウラミドプロピルベタイン'),
    ('SODIUM COCOYL GLUTAMATE', 'ココイルグルタミン酸Na'),
    ('COCAMIDE MEA', 'コカミドMEA'),
    ('BEHENTRIMONIUM CHLORIDE', 'ベヘントリモニウムクロリド'),
    ('POLYQUATERNIUM-10', 'ポリクオタニウム-10'),
    ('ETHYLHEXYL METHOXYCINNAMATE', 'メトキシケイヒ酸エチルヘキシル'),
    ('PHENOXYETHANOL', 'フェノキシエタノール'),
    ('SODIUM BENZOATE', '安息香酸Na'),
    ('GLYCERYL CAPRYLATE', 'カプリル酸グリセリル'),
    ('TOCOPHEROL', 'トコフェロール（ビタミンE）'),
    ('TOCOPHEROL', 'トコフェロール'),
    ('TOCOPHEROL', 'ビタミンE'),
    ('CITRIC ACID', 'クエン酸'),
    ('SODIUM CHLORIDE', '塩化Na（塩）'),
    ('SODIUM CHLORIDE', '塩化Na'),
    ('DISODIUM EDTA', 'EDTA-2Na'),
    ('FRAGRANCE', '香料'),
    ('MENTHOL', 'メントール'),
    ('MENTHYL LACTATE', '乳酸メンチル'),
    ('TOCOPHEROL', 'Vitamin E'),
    ('TOCOPHEROL', 'dl-α-トコフェロール'),
    ('TOCOPHERYL ACETATE', 'ビタミンE酢酸エステル'),
    ('NIACINAMIDE', 'ビタミンB3'),
    ('NIACINAMIDE', 'ニコチン酸アミド'),
    ('ASCORBYL GLUCOSIDE', 'ビタミンC誘導体'),
    ('ASCORBYL GLUCOSIDE', 'AA2G'),
    ('PANTHENOL', 'プロビタミンB5'),
    ('PANTHENOL', 'パントテニルアルコール'),
    ('WATER', '精製水'),
    ('WATER', 'Aqua'),
    ('WATER', 'H2O'),
    ('BUTYLENE GLYCOL', '1,3-ブチレングリコール'),
    ('SODIUM HYALURONATE', 'ヒアルロン酸ナトリウム'),
    ('TITANIUM DIOXIDE', '二酸化チタン'),
    ('ZINC OXIDE', '亜鉛華'),
    ('IRON OXIDES', 'ベンガラ'),
    ('IRON OXIDES', '酸化鉄類'),
    ('CI 77491', '酸化鉄（赤）'),
    ('CI 77492', '酸化鉄（黄）'),
    ('CI 77499', '酸化鉄（黒）'),
    ('CI 15850', '赤202'),
    ('CI 45410', '赤223'),
    ('CI 19140', '黄4'),
    ('CI 42090', '青1'),
    ('CERA ALBA', 'ビーズワックス'),
    ('CERA ALBA', 'Beeswax'),
    ('CERA ALBA', '蜜蝋'),
    ('CANDELILLA WAX', 'カンデリラワックス'),
    ('CANDELILLA WAX', 'Euphorbia Cerifera Wax'),
    ('SILICA', '無水ケイ酸'),
    ('SILICA', 'シリカ（二酸化ケイ素）'),
    ('SODIUM CHLORIDE', '食塩'),
    ('SODIUM CHLORIDE', '塩化ナトリウム'),
    ('DISODIUM EDTA', 'エデト酸2Na'),
    ('DISODIUM EDTA', 'EDTA-2ナトリウム'),
    ('PHENOXYETHANOL', 'フェノキシエタノール（防腐剤）'),
    ('SODIUM BENZOATE', '安息香酸ナトリウム'),
    ('CITRIC ACID', 'クエン酸（pH調整剤）'),
    ('FRAGRANCE', 'Parfum'),
    ('FRAGRANCE', '香料（合成香料）'),
    ('MENTHOL', 'l-メントール'),
    ('MENTHOL', 'ハッカ脳'),
    ('DIMETHICONE', 'シリコーンオイル'),
    ('DIMETHICONE', 'ジメチルポリシロキサン'),
    ('SIMMONDSIA CHINENSIS SEED OIL', 'ホホバオイル'),
    ('SIMMONDSIA CHINENSIS SEED OIL', 'ホホバ油'),
    ('ARGANIA SPINOSA KERNEL OIL', 'アルガン油'),
    ('RICINUS COMMUNIS SEED OIL', 'ヒマシ油（キャスターオイル）'),
    ('RICINUS COMMUNIS SEED OIL', 'Castor Oil'),
    ('SQUALANE', 'スクアラン'),
    ('GLYCERIN', '濃グリセリン'),
    ('GLYCERIN', 'グリセリン（保湿剤）'),
    ('SODIUM LAURETH SULFATE', 'ラウレス硫酸ナトリウム'),
    ('COCAMIDOPROPYL BETAINE', 'ヤシ油脂肪酸アミドプロピルベタイン'),
    ('SODIUM COCOYL GLUTAMATE', 'ココイルグルタミン酸ナトリウム'),
    ('ETHYLHEXYL METHOXYCINNAMATE', 'パラメトキシケイヒ酸2-エチルヘキシル'),
    ('ETHYLHEXYL METHOXYCINNAMATE', 'オクチノキサート'),
    ('SALICYLIC ACID', 'BHA'),
    ('SALICYLIC ACID', 'サリチル酸（BHA）'),
    ('HYDROLYZED KERATIN', '加水分解ケラチン（羊毛）'),
    ('CAMELLIA SINENSIS LEAF EXTRACT', 'チャエキス'),
    ('CAMELLIA SINENSIS LEAF EXTRACT', '緑茶エキス'),
    ('ZINC PYRITHIONE', 'ピリチオン亜鉛'),
    ('PIROCTONE OLAMINE', 'オクトピロックス'),
    ('ISOPROPYL METHYLPHENOL', 'IPMP'),
    ('CETEARYL ALCOHOL', 'セトステアリルアルコール'),
    ('STEARYL ALCOHOL', 'ステアリルアルコール（高級アルコール）'),
    ('MENTHYL LACTATE', '乳酸l-メンチル'),
    ('BIOTIN', 'ビタミンH'),
    ('POLYQUATERNIUM-10', '塩化O-[2-ヒドロキシ-3-(トリメチルアンモニオ)プロピル]ヒドロキシエチルセルロース'),
    ('BEHENTRIMONIUM CHLORIDE', 'ベヘントリモニウムクロリド（カチオン界面活性剤）')
  ) as seed(inci, alias)
  join ingredients_master im on normalize_ingredient_name(im.inci) = normalize_ingredient_name(seed.inci)
  on conflict (alias_norm) do nothing;
  get diagnostics n = row_count;
  added := added + n;

  return added;
end;
$$;

select seed_ingredient_aliases();

-- ---------------------------------------------------------------- 未正規化の可視化
-- 引き当てられなかった成分名。似ている別名を候補として一緒に出し、辞書に足す判断ができるようにする。
create or replace view unresolved_ingredients
with (security_invoker = on) as
with raw as (
  select p.id as product_id,
         brands.name || ' ' || p.name as product_label,
         btrim(ing) as raw_name
  from products p
  join brands on brands.id = p.brand_id
  cross join unnest(p.ingredients) as ing
  where btrim(ing) <> ''
)
select r.raw_name as name,
       count(distinct r.product_id) as product_count,
       (array_agg(distinct r.product_label))[1:3] as sample_products,
       max(suggest.alias) filter (where suggest.rn = 1) as suggested_alias,
       max(suggest.sim) filter (where suggest.rn = 1) as suggested_similarity
from raw r
left join lateral (
  select a.alias,
         similarity(a.alias_norm, normalize_ingredient_name(r.raw_name)) as sim,
         row_number() over (
           order by similarity(a.alias_norm, normalize_ingredient_name(r.raw_name)) desc, a.alias
         ) as rn
  from ingredient_aliases a
  where normalize_ingredient_name(r.raw_name) is not null
  order by sim desc
  limit 1
) suggest on true
where resolve_ingredient_id(r.raw_name) is null
group by r.raw_name
order by product_count desc, name;

-- 辞書の育ち具合。管理画面のヘッダに出す。
create or replace view ingredient_normalization_status
with (security_invoker = on) as
with raw as (
  select distinct btrim(ing) as raw_name
  from products p
  cross join unnest(p.ingredients) as ing
  where btrim(ing) <> ''
)
select (select count(*) from ingredient_aliases) as alias_count,
       (select count(*) from ingredient_aliases where kind = 'common') as common_alias_count,
       (select count(*) from ingredients_master) as ingredient_count,
       count(*) as distinct_ingredient_names,
       count(*) filter (where resolve_ingredient_id(raw_name) is not null) as resolved_names,
       count(*) filter (where resolve_ingredient_id(raw_name) is null) as unresolved_names
from raw;

-- ---------------------------------------------------------------- 一覧の「避けたい成分」
-- search_products_page は避けたい成分を upper(inci) の一致で見ていたため、
-- 全成分表示が日本語表示名や慣用名で入っていると減点が効かない。引き当てに差し替える。
create or replace function search_products_page(
  p_q text default null,
  p_category text default null,
  p_mens boolean default false,
  p_sort text default 'recommended',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id bigint,
  name text,
  category text,
  is_mens boolean,
  price_yen int,
  volume numeric,
  volume_unit text,
  jan text,
  image_url text,
  color_hex text,
  ingredients text[],
  brand_name text,
  product_colors jsonb,
  ranked_rating numeric,
  owned boolean,
  avoided boolean,
  total_count bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  with avoided_ids as (
    select pa.ingredient_id
    from profile_allergens pa
    where pa.user_id = auth.uid()
  ),
  owned_items as (
    select ui.product_id
    from user_items ui
    where ui.user_id = auth.uid()
  ),
  input as (
    select nullif(btrim(coalesce(p_q, '')), '') as term
  ),
  -- 商品名 + ブランド名のあいまい一致は既存の RPC に任せる（候補だけを引く）。
  hits as (
    select sp.product_id, sp.score
    from input i
    cross join lateral search_products(
      i.term,
      nullif(p_category, ''),
      nullif(coalesce(p_mens, false), false),
      500
    ) sp
    where i.term is not null
  ),
  matched as (
    select
      pr.*,
      coalesce(h.score, 0) as search_score,
      exists (select 1 from owned_items o where o.product_id = pr.id) as owned,
      exists (
        select 1
        from unnest(pr.ingredients) as ing
        join avoided_ids a on a.ingredient_id = resolve_ingredient_id(ing)
      ) as avoided
    from products_ranked pr
    left join hits h on h.product_id = pr.id
    where ((select i.term from input i) is null or h.product_id is not null)
      and (p_category is null or p_category = '' or pr.category = p_category)
      and (not coalesce(p_mens, false) or pr.is_mens)
  ),
  scored as (
    select
      m.*,
      count(*) over () as total_count,
      coalesce(m.ranked_rating, 0)
        - case when m.owned then 2 else 0 end
        - case when m.avoided then 10 else 0 end as recommend_score
    from matched m
  )
  select
    s.id,
    s.name,
    s.category,
    s.is_mens,
    s.price_yen,
    s.volume,
    s.volume_unit,
    s.jan,
    s.image_url,
    s.color_hex,
    s.ingredients,
    b.name as brand_name,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('pos', pc.pos, 'shade_name', pc.shade_name, 'hex', pc.hex)
          order by pc.pos
        )
        from product_colors pc
        where pc.product_id = s.id
      ),
      '[]'::jsonb
    ) as product_colors,
    s.ranked_rating,
    s.owned,
    s.avoided,
    s.total_count
  from scored s
  join brands b on b.id = s.brand_id
  order by
    -- 検索語がある場合のおすすめ順は、まず一致度の高いものから。
    case
      when p_sort not in ('cheap', 'expensive', 'new', 'rating') then s.search_score
    end desc nulls last,
    case when p_sort = 'cheap' then s.price_yen end asc nulls last,
    case when p_sort = 'expensive' then s.price_yen end desc nulls last,
    case when p_sort = 'new' then s.created_at end desc nulls last,
    case when p_sort = 'rating' then s.ranked_rating end desc nulls last,
    case
      when p_sort not in ('cheap', 'expensive', 'new', 'rating') then s.recommend_score
    end desc nulls last,
    s.id desc
  limit greatest(coalesce(p_limit, 20), 0)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------- linter 対応
alter function normalize_ingredient_name(text) set search_path = public, pg_temp;
alter function resolve_ingredient_id(text, double precision) set search_path = public, pg_temp;
alter function resolve_ingredient(text) set search_path = public, pg_temp;
alter function trg_ingredients_master_aliases() set search_path = public, pg_temp;
alter function seed_ingredient_aliases() set search_path = public, pg_temp;
alter function build_ingredient_vec(text[]) set search_path = public, pg_temp;
alter function refresh_ingredient_idf() set search_path = public, pg_temp;

-- 既存データの成分ベクトルを辞書経由で作り直す。
select refresh_ingredient_idf();
