-- Server Action 側の zod 検証（src/lib/validation.ts）と同じ範囲を DB でも守る。
-- Server Action は HTTP エンドポイントなので、アプリを通らない書き込みも前提にする。

-- 使用感は 0..100 の数値で、軸名は決まった集合だけ。未知のキーや範囲外は入れさせない。
create or replace function public.feel_is_valid(f jsonb)
returns boolean
language sql
immutable
as $$
  select f is null or (
    jsonb_typeof(f) = 'object'
    and not exists (
      select 1
      from jsonb_each(f) as e(key, value)
      where e.key not in ('gloss', 'coverage', 'lasting', 'moist', 'spread', 'foam', 'smooth', 'scent')
        or jsonb_typeof(e.value) <> 'number'
        or (e.value)::numeric < 0
        or (e.value)::numeric > 100
    )
  );
$$;

alter function public.feel_is_valid(jsonb) set search_path = public, pg_temp;

do $$
begin
  alter table reviews add constraint reviews_feel_valid check (public.feel_is_valid(feel));
exception
  when duplicate_object then null;
end
$$;

-- 本文は空でも巨大でも困る。zod と同じ 1..2000 文字にそろえる。
do $$
begin
  alter table reviews add constraint reviews_body_length_check
    check (char_length(btrim(body)) between 1 and 2000);
exception
  when duplicate_object then null;
end
$$;

-- rating は init で 1..5 の CHECK が入っている。既存 DB に無い場合だけ補う。
do $$
begin
  alter table reviews add constraint reviews_rating_check check (rating between 1 and 5);
exception
  when duplicate_object then null;
end
$$;
