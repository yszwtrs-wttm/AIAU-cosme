-- 価格の出典と取得時点。
--   * price_source: どこの価格か（メーカー公表価格 / 公式オンラインストアなど）。
--   * price_checked_at: いつ時点の価格か。
-- KAWANAI は「同じ処方でこっちが安い」を出すので、価格の根拠を画面に添えられるようにする。
-- 販売リンク・アフィリエイトは持たないため、実売価格ではなく参考価格であることも前提にしている。

alter table products
  add column if not exists price_source text not null default 'メーカー公表価格（デモデータ）',
  add column if not exists price_checked_at date not null default current_date;

comment on column products.price_source is '価格の出典。画面には「参考価格 / 出典」として出す。実売価格ではない。';
comment on column products.price_checked_at is '価格を確認した日。画面には「YYYY/M/D 時点」として出す。';
