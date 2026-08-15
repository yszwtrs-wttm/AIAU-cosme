-- 手持ちの「使い切り管理」に必要な項目を user_items に足す。
-- opened_at / remaining_pct は init から持っているが、購入情報とメモが無かった。
--   * purchased_at        : 買った日。開封日が未入力のときの期限計算のフォールバックにも使う。
--   * purchase_price_yen  : 実際に払った金額（セール価格など、定価と違うことがある）。
--   * note               : 色番・使う場面など、本人しか分からないメモ。

alter table user_items add column if not exists purchased_at date;

alter table user_items add column if not exists purchase_price_yen int;

alter table user_items add column if not exists note text;

do $$
begin
  alter table user_items add constraint user_items_purchase_price_check
    check (purchase_price_yen is null or purchase_price_yen between 0 and 1000000);
exception
  when duplicate_object then null;
end
$$;

comment on column user_items.opened_at is '開封日。カテゴリ別の使用期限目安と合わせて「使い切りたい順」を出す。';
comment on column user_items.purchased_at is '購入日。開封日が未入力のときの期限計算に使う。';
comment on column user_items.purchase_price_yen is '実際に払った金額。';
comment on column user_items.remaining_pct is '残量。UI では たっぷり(100) / 半分(50) / わずか(15) の3段階で入れる。';
comment on column user_items.note is '本人向けメモ。';

-- 開封日で並べ替えるので索引を足す（1ユーザーの件数は少ないが、期限順の一覧で毎回使う）。
create index if not exists user_items_user_opened_idx on user_items (user_id, opened_at);
