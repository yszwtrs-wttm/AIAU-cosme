-- 通報のゲートをアプリ層（reportReview）と揃える。
-- 匿名セッション（お試し利用）からは通報できない。同一ユーザーの同一口コミへの二重通報も弾く。

drop policy if exists "reports insertable" on review_reports;

create policy "reports insertable" on review_reports
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- flags は text[] なので、未型付けの 'reported' だと `||` が配列リテラルとして解釈され
-- insert のたびに 22P02 malformed array literal になっていた。明示的に text にキャストする。
create or replace function trg_review_reports_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_product bigint;
begin
  select count(*) into v_count from review_reports where review_id = new.review_id;
  select product_id into v_product from reviews where id = new.review_id;

  update reviews
  set report_count = v_count,
      excluded = case when v_count >= 3 then true else excluded end,
      flags = case when v_count >= 3 and not ('reported' = any(flags))
                   then flags || 'reported'::text else flags end
  where id = new.review_id;

  if v_product is not null then
    perform recompute_review_trust(v_product);
  end if;
  return new;
end;
$$;

-- 初期スキーマより後に作られた環境でも二重通報を弾けるようにしておく。
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'review_reports'::regclass and conname = 'review_reports_review_id_user_id_key'
  ) then
    alter table review_reports add constraint review_reports_review_id_user_id_key unique (review_id, user_id);
  end if;
end;
$$;
