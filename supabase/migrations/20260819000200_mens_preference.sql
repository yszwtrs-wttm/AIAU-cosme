-- メンズ向けの導線。
--   * profiles.prefers_mens: メンズ向け商品を優先して見たいか。検索の既定値に使う。
--   * category に 'eyebrow' を追加し、メンズのアイブロウをシードで持てるようにする。

alter table profiles add column if not exists prefers_mens boolean not null default false;

alter table products drop constraint if exists products_category_check;
alter table products add constraint products_category_check
  check (category in ('lip', 'foundation', 'shampoo', 'treatment', 'sunscreen', 'bb', 'eyeshadow', 'eyebrow'));
