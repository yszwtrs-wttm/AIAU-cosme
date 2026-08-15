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

Docker が使える場合はローカルスタックを起動する。Docker を使わない場合は [Docker なしで開発する（リモート Supabase 接続）](#docker-なしで開発するリモート-supabase-接続)へ。

```bash
npm install
cp .env.example .env.local     # ローカルは npx supabase status のキーを入れる
npx supabase start             # Docker が必要
npm run db:reset               # マイグレーション + シード投入
npm run dev
```

シードを作り直す場合は `npm run seed:gen`（`scripts/generate_seed.py` が決定論的に生成）。

シードの商品・ブランド・口コミはすべて架空。実在商品のデータは使っていない。

## Docker なしで開発する（リモート Supabase 接続）

Docker が使えない環境（CI / Devin のセッション / 制限のあるPC）では、ローカルスタックを起動せず、リモートの Supabase プロジェクトに `.env.local` を向ければ `npm run dev` だけで画面が動く。フロントエンドは `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` しか見ていないので、その2つがリモートを指していればよい。

### A. 開発用プロジェクトに直接つなぐ

1. [Supabase ダッシュボード](https://supabase.com/dashboard) で開発用プロジェクトを作る（本番とは別プロジェクトにする）。
2. Project Settings → API から Project URL と anon key を取得し、`.env.local` に書く。

   ```bash
   npm install
   cp .env.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```

3. そのプロジェクトにスキーマを適用する（初回のみ / マイグレーション追加時）。`db push` は Docker 不要。

   ```bash
   npx supabase login
   npm run db:link -- --project-ref <project-ref>   # DB パスワードを聞かれる
   npm run db:migrations                            # ローカルとリモートの適用状況を比較
   npm run db:push                                  # 未適用のマイグレーションだけを順に適用
   npm run db:push:seed                             # デモデータを入れる場合のみ（下記の注意を読む）
   ```

4. 接続とスキーマを確認して起動する。

   ```bash
   npm run check:remote   # URL/キー・主要テーブル・lab_delta_e を確認
   npm run dev
   ```

`/login` のメール確認リンクは Authentication → URL Configuration の Site URL / Redirect URLs に `http://localhost:3000` を追加しておく。画像つき口コミとアイコンで使う Storage バケット（`review-images` / `avatars`）はマイグレーションで作られるので手作業は不要。

### B. ブランチデータベース（Supabase Branching）を使う

本体の開発プロジェクトを汚さずに試す場合は、プロジェクトの Branching を有効にして PR / 開発用ブランチを作る。ブランチ作成時に `supabase/migrations` が自動で適用され、`supabase/config.toml` の `[db.seed]` が有効なため `supabase/seed.sql` も投入される。

1. ダッシュボードの Branches からブランチを作る（または `npx supabase branches create <name> --experimental`）。
2. ブランチの URL と anon key を取得して `.env.local` に入れる。

   ```bash
   npx supabase branches get <name> --experimental -o env
   ```

3. `npm run check:remote && npm run dev`。

ブランチはマージ / 削除で破棄されるので、壊しても本体に影響しない。マイグレーションを追加したらブランチに push（`npm run db:push`）するか、ブランチを作り直す。

### どちらの手順でも壊さないための注意

- **マイグレーションは必ずファイル名の昇順に適用する。** 手でダッシュボードの SQL Editor に貼らず `npm run db:push` を使う。`supabase_migrations.schema_migrations` に履歴が残り、二重適用を避けられる。既存プロジェクトで履歴がずれている場合は `npx supabase migration repair --status applied <version>` で合わせる。
- **スキーマ変更は `supabase/migrations/` に新しいファイルを追加する。** 既存のマイグレーションを書き換えると、すでに適用済みのリモート DB に反映されず、ローカルとの差分になる。
- **`supabase/seed.sql` は冒頭で `truncate ... restart identity cascade` を実行する。** 共有している開発プロジェクトや本番に対して `db:push:seed` / `db:reset` を実行すると商品・口コミ・ポーチのデータが消える。自分専用のプロジェクトかブランチに対してだけ流す。ユーザー（`auth.users`）とプロフィールは truncate されないため、シードを流し直すと口コミが消えたユーザーが残る点にも注意。
- **本番プロジェクトの URL / キーを `.env.local` に入れない。** `.env.local` は `.gitignore` 済みだが、開発中の口コミ投稿や手持ち登録がそのまま本番データになる。
- `service_role` key は使わない（アプリはブラウザから anon key で RLS 越しに読む前提）。

## 型定義

`src/lib/supabase/database.types.ts` は `supabase/migrations/` から生成する。マイグレーションを追加・変更したら再生成してコミットする。

```bash
npx supabase start             # ローカルDBが起動していること
npm run db:types
```

Docker が無い環境では `npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts` でリンク済みプロジェクトから生成できる。

## 検証

```bash
npm run lint
npm run typecheck
npm run build
```
