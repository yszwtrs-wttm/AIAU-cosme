-- 口コミ本文の上限を DB 側でも縛る。UI（src/lib/review.ts の REVIEW_BODY_MAX）と同じ 1000 文字。
-- 既存の reviews_body_length_check（1..2000）とは別名で足す。両方あれば厳しい方（1000）が効く。
do $$
begin
  alter table reviews add constraint reviews_body_max_length_check
    check (char_length(btrim(body)) <= 1000);
exception
  when duplicate_object then null;
end
$$;
