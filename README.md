# KAWANAI

「買わなくていい」を、成分と色の数値で証明するアプリ。

LIPS や @cosme は「何を買うか」を決めるアプリ。KAWANAI は手持ちコスメと候補商品を **全成分ベクトル**と **CIELAB の色差 ΔE(CIEDE2000)** で突き合わせ、「それ、もう持っています」「同じ処方でこっちが ¥2,820 安い」を数値で示す。

## 機能

| 機能 | 実装 |
| --- | --- |
| トップ | `/`。未ログインは紹介ページ、本アカウントは肌情報・ポーチをもとにしたおすすめ |
| 商品を探す | `/search`。商品名検索・カテゴリ・メンズ絞り込み。信用できる口コミの評価が高い順 |
| 手持ち登録 | `/scan`（本アカウント限定）。人気商品のチェックリストで一括登録 + zxing の連続バーコードスキャン |
| 被り検出 | `find_duplicates_in_stash` / `find_stash_overlaps`（pgvector cosine + ΔE） |
| 安い代替 | `find_cheaper_dupes`（類似スコア閾値 × 価格差） |
| 口コミ信頼度 | `recompute_review_trust`。スコアと除外理由は内部で使い、UI には出さない |
| 画像から色検出 | `/color`。主要色を抽出 → Lab 変換 → `find_by_color`。色名・系統・肌トーン順で提示 |
| 手持ちだけのメイク提案 | `/stash`（本アカウント限定）。`OPENAI_API_KEY` があれば LLM、無ければルールベース |
| 認証 / プロフィール | `/login`（初回はメールのリンクで確認し、プロフィール作成画面でパスワードを設定。以降はメールアドレス＋パスワードでログイン）、`/settings`、`/me`、`/u/[handle]` |
| 画像つき口コミ | `/feed`。1投稿4枚まで、Supabase Storage の `review-images` に保存。アップロード時に長辺1600pxのWebPへ縮小し、一覧はサムネ幅で読む |
| 成分の日本語化 | `src/lib/ingredients.ts` の辞書で日本語名・役割・効果に変換 |
| 使用感 | `src/lib/feel.ts`。口コミがあれば平均、無ければ成分からの推定 |
| メンズ | シャンプー / トリートメント / BB / 日焼け止めをカテゴリに保持 |

## 成分ベクトル

全成分表示は配合量の多い順に書かれるので、配合順を重みにして 256 次元にハッシュする。

```
w_i = (1 / log2(i + 2)) * idf(ingredient)
```

共通の基剤（水、BG、グリセリンなど）は IDF で寄与を落とす。L2 正規化して pgvector の cosine 距離で比較する。

### 定期再計算

IDF は商品が増えるたびに変わるので、Supabase Cron（`pg_cron`）で日次 18:00 UTC（JST 3:00）に
`refresh_ingredient_idf_logged()` を実行し、DF / IDF を数え直して `products.ingredient_vec` を全行再生成する。
手動で走らせたい場合は `select refresh_ingredient_idf_logged();`。

実行ログは `maintenance_runs` に残る。最終実行はビューで確認する。

```sql
select * from ingredient_idf_status;
-- started_at | finished_at | duration_ms | products | ingredients | status | detail
```

## 色差

HEX → CIELAB に変換し、CIEDE2000 を Postgres 関数 `lab_delta_e` で計算する。

- ΔE < 1：ほぼ判別不能
- ΔE < 2：並べても見分けにくい
- ΔE < 5：似ている

UI には数値を出さず、`src/lib/wording.ts` で「ほぼ同じ色」「かなり近い」などの日本語に置き換える。成分の cosine 類似度も同様に「中身ほぼ同じ」などにする。

## 口コミの不正検出

削除はしない。疑わしい口コミは理由付きで残したまま、総合評価から外す。

- 文体の類似クラスタ / 投稿バースト / 同一ブランドへの偏重 / PR定型文 / 画像 pHash の使い回し

投稿ゲート: 本アカウント必須（未ログインは不可）、ポーチに登録済みの商品のみ、1日5件・同一ブランド1日2件・1商品1件まで。通報3件で総合評価から除外（削除はしない）。

閲覧（商品・成分・口コミ・色検索）はログイン不要で、訪問者に匿名セッションも発行しない（公開読み取りは RLS の select ポリシーで anon ロールに許可している）。初回登録はメールのリンクで確認し、プロフィール作成画面でパスワードを設定する。以降はメールアドレス＋パスワードでログインする。手持ち登録・ポーチの利用・口コミ投稿には本アカウントが必要。

## セットアップ

```bash
npm install
cp .env.example .env.local     # ローカルは npx supabase status のキーを入れる
npx supabase start             # Docker が必要
npm run db:reset               # マイグレーション + シード投入
npm run dev
```

シードを作り直す場合は `npm run seed:gen`（`scripts/generate_seed.py` が決定論的に生成）。

シードの商品・ブランド・口コミはすべて架空。実在商品のデータは使っていない。

## 型定義

`src/lib/supabase/database.types.ts` は `supabase/migrations/` から生成する。マイグレーションを追加・変更したら再生成してコミットする。

```bash
npx supabase start             # ローカルDBが起動していること
npm run db:types
```

再生成し忘れると CI（`.github/workflows/ci.yml` の `db-types` ジョブ）が差分を検出して落ちる。

## 検証

```bash
npm run lint
npm run typecheck
npm run build
```
