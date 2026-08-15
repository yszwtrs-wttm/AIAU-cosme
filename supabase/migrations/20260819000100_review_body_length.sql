-- 口コミ本文の長さを DB 側でも縛る。UI（src/lib/review.ts の REVIEW_BODY_MAX）と同じ 1000 文字。
-- 空文字の投稿も弾く（本文はクライアント / サーバーアクションで正規化してから入る）。
do $$
begin
  alter table reviews add constraint reviews_body_length_check
    check (char_length(body) between 1 and 1000);
exception
  when duplicate_object then null;
end
$$;
