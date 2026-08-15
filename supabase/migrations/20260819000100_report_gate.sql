-- 通報のゲートをアプリ層（reportReview）と揃える。
-- 匿名セッション（お試し利用）からは通報できない。同一ユーザーの同一口コミへの二重通報も弾く。

drop policy if exists "reports insertable" on review_reports;

create policy "reports insertable" on review_reports
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

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
