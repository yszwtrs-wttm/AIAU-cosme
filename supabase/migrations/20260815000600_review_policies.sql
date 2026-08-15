-- 口コミ投稿はログイン済み（匿名サインインを含む）なら可能。
-- 「投稿した瞬間に不正判定が走って補正スコアが動く」をデモで見せるため。
create policy "reviews insertable" on reviews
  for insert to authenticated
  with check (true);

create policy "investigations insertable" on review_investigations
  for insert to authenticated
  with check (true);
