# KAWANAI

**「本当に自分に合うもの」を成分と色の数値で見つけるコスメ判断アプリ。**

LIPS や @cosme は「何が人気か」を教えてくれる。KAWANAI は手持ちコスメとプロフィール（肌の状態・肌の色）を持っているので、
気になった商品について **「あなたに合うか」「もう似たものを持っていないか」「似ていて安いものはあるか、でも高い方の良さは何か」** を数値で判定して見せる。
判定の材料は全成分表示（配合順）と色の実測値（CIELAB / ΔE CIEDE2000）で、口コミは信用できるものだけを集計に入れる。

- 3日間のハッカソン（AIAU Craft Day）で開発。Supabase と Devin を使用。
- コードはすべて Devin が書いている。人間がやったのは仕様の決定と却下、UI 文言の判断。

## 審査項目とこの README の対応

| 審査項目 | 該当セクション |
| --- | --- |
| スポンサーツール活用度（Supabase / Devin） | [Supabase の使い方](#supabase-の使い方) / [Devin の使い方](#devin-の使い方) |
| 完成度 / 動作 | [デモ](#デモ) / [セットアップ](#セットアップ) / [検証](#検証) |
| アイデア / 独創性 | [判定の仕組み](#判定の仕組み) |
| 課題解決 / インパクト | [解きたい課題](#解きたい課題) |
| プレゼンテーション | [機能](#機能) |

## デモ

<!-- TODO: 公開URL・デモ動画・スクリーンショットを貼る -->
- 公開URL: （準備中）
- デモ動画（30〜60秒）: （準備中）
- ローカルで見る場合は [セットアップ](#セットアップ) の5コマンドで起動する。ログイン不要で `/search`・商品ページ・`/color`・`/feed` は閲覧できる。

3分で価値が伝わる動線:

1. `/search` で商品を探す（信用できる口コミの評価が高い順に並ぶ）
2. 商品ページ上部で「あなたに合いそう／少し注意」と理由を読む
3. 同じページの比較セクションで「似ていて安い商品」との使い心地チャートと価格差を見る
4. `/color` に手持ちリップの写真を上げて、近い色の商品を探す
5. `/stash` で手持ちだけで組めるメイクを提案させる

## 解きたい課題

コスメは「持っているのに買う」が起きやすい。色番号の違いは店頭では判別できず、成分（＝中身）は英語の羅列で読めないため、
値段の差が中身の差なのかブランドの差なのか判断できない。既存の口コミアプリは「買う理由」を増やす方向にしか働かない。

KAWANAI が答えるのは次の4つ。

- この商品は**自分の肌の状態と肌の色に合うか**（`src/lib/fit.ts`）
- **もう似たものを持っていないか**（成分 cosine + ΔE、`find_duplicates_in_stash`）
- **似ていて安いものはないか**（`find_cheaper_dupes`）
- それでも**高い方に良さはあるか**（使い心地5軸の差分、`src/lib/compare.ts`）

「買わない」ためのアプリではなく、無駄を削って本当に必要なものに予算を回すためのアプリ。

## 機能

| 機能 | 実装 |
| --- | --- |
| トップ | `/`。未ログインは紹介ページ、本アカウントは肌情報・ポーチをもとにしたおすすめ |
| 商品を探す | `/search`。商品名・ブランド名を pg_trgm の類似度順で検索（`search_products`）、カテゴリ・メンズ絞り込み。信用できる口コミの評価が高い順 |
| 合うかどうかの判定 | 商品ページ上部（`src/components/FitCard.tsx`）。肌の状態×成分の役割、肌の色に近い色番号を提示。判定できないときは言い切らない |
| 似ていて安い物との比較 | `src/components/ComparePanel.tsx`。使い心地5軸のチャートで横並び、価格差と成分の違いを1行で。高い方の良さも同じ大きさで出す |
| 手持ち登録 | `/scan`（本アカウント限定）。人気商品のチェックリストで一括登録 + zxing の連続バーコードスキャン |
| 被り検出 | `find_duplicates_in_stash` / `find_stash_overlaps`（pgvector cosine + ΔE） |
| 安い代替 | `find_cheaper_dupes`（類似スコア閾値 × 価格差） |
| 口コミ信頼度 | `recompute_review_trust`。スコアと除外理由は内部で使い、UI には出さない |
| 画像から色検出 | `/color`。主要色を抽出 → Lab 変換 → `find_by_color`。色名・系統・肌トーン順で提示 |
| 手持ちだけのメイク提案 | `/stash`（本アカウント限定）。`OPENAI_API_KEY` があれば LLM、無ければルールベース |
| 認証 / プロフィール | `/login`（初回はメールのリンクで確認し、プロフィール作成画面でパスワードを設定。以降はメールアドレス＋パスワードでログイン）、`/settings`、`/me`、`/u/[handle]` |
| 画像つき口コミ | `/feed`。1投稿4枚まで、Supabase Storage の `review-images` に保存。アップロード時に長辺1600pxのWebPへ縮小し、一覧はサムネ幅で読む |
| 成分の日本語化 | `src/lib/ingredients.ts` の辞書で日本語名・役割・効果に変換（INCI の英語をそのまま出さない） |
| 使用感 | `src/lib/feel.ts`。口コミがあれば平均、無ければ成分からの推定 |
| メンズ | シャンプー / トリートメント / BB / 日焼け止めをカテゴリに保持 |

## 判定の仕組み

### 成分ベクトル

全成分表示は配合量の多い順に書かれるので、配合順を重みにして 256 次元にハッシュする。

```
w_i = (1 / log2(i + 2)) * idf(ingredient)
```

共通の基剤（水、BG、グリセリンなど）は IDF で寄与を落とす。L2 正規化して pgvector の cosine 距離で比較する。
ベクトル生成は Postgres 側の `build_ingredient_vec` + トリガなので、商品を入れれば自動で計算される。

#### 定期再計算

IDF は商品が増えるたびに変わるので、Supabase Cron（`pg_cron`）で日次 18:00 UTC（JST 3:00）に
`refresh_ingredient_idf_logged()` を実行し、DF / IDF を数え直して `products.ingredient_vec` を全行再生成する。
手動で走らせたい場合は `select refresh_ingredient_idf_logged();`。

実行ログは `maintenance_runs` に残る。最終実行はビューで確認する。

```sql
select * from ingredient_idf_status;
-- started_at | finished_at | duration_ms | products | ingredients | status | detail
```

### 色差

HEX → CIELAB に変換し、CIEDE2000 を Postgres 関数 `lab_delta_e` で計算する（クライアントに持ってこない）。

- ΔE < 1：ほぼ判別不能
- ΔE < 2：並べても見分けにくい
- ΔE < 5：似ている

UI には数値を出さず、`src/lib/wording.ts` で「見分けがつきません」「かなり近い色です」などの日本語に置き換える。
成分の cosine 類似度も同様に「中身ほぼ同じ」などにする。**ΔEや信頼度スコアは判定に使い、画面には出さない**という方針。

### 使い心地

成分は「中身が同じか」を証明できるが、使い心地は語れない。`src/lib/feel.ts` でツヤ / カバー力 / 崩れにくさ / うるおい / 伸び（ヘア系は別軸）を、
口コミの実測平均、無ければ配合順からの推定値として同じ軸で扱い、比較チャートに使う。

### 口コミの不正検出

削除はしない。疑わしい口コミは理由付きで残したまま、総合評価から外す。

- 文体の類似クラスタ / 投稿バースト / 同一ブランドへの偏重 / PR定型文 / 画像 pHash の使い回し（`src/lib/phash.ts`）

投稿ゲート: 本アカウント必須（未ログインは不可）、1日5件・同一ブランド1日2件・1商品1件まで。通報3件で総合評価から除外（削除はしない）。
持っているかどうかは自己申告なので投稿条件にはせず、手持ちに登録済みの人の口コミを集計で少し重く見る（`trust_score * 1.3`）だけにしている。
これらはすべて RLS ポリシーと DB のトリガで強制していて、アプリ側の実装ミスでは抜けない。

閲覧（商品・成分・口コミ・色検索）はログイン不要で、訪問者に匿名セッションも発行しない（公開読み取りは RLS の select ポリシーで anon ロールに許可している）。手持ち登録・ポーチの利用・口コミ投稿には本アカウントが必要。

## Supabase の使い方

CRUD だけでなく、**判定ロジック自体を Postgres 側に置いている**。

| 使った機能 | 用途 |
| --- | --- |
| Postgres + pgvector | 成分ベクトル `vector(256)` と cosine 距離での類似検索。全体検索は HNSW 索引、手持ちとの突き合わせは全件計算（`20260819000100_hnsw_ingredient_vec.sql` に選定理由） |
| Postgres 関数 | `lab_delta_e`（CIEDE2000 を SQL で実装）、`dupe_score`、`find_duplicates_in_stash`、`find_cheaper_dupes`、`find_stash_overlaps`、`find_by_color`、`find_palette_coverage`、`recompute_review_trust`、`search_products` |
| pg_trgm | 商品名・ブランド名の部分一致と類似度検索（GIN 索引） |
| pg_cron | IDF の日次再計算と実行ログ（`maintenance_runs` / `ingredient_idf_status`） |
| トリガ | 商品登録で成分ベクトル生成、色の HEX → Lab 変換、口コミ投稿でレート制限・信頼度再計算・画像枚数制限・pHash 同期 |
| RLS / セキュリティ | 公開読み取りと投稿条件を DB 側で強制（`20260815000600_review_policies.sql`、`20260816000100_profiles_and_reviews.sql`、`20260815000700_harden_functions.sql` で `search_path` 固定） |
| Auth | メールのリンクで初回確認 → パスワード設定。匿名サインインは使わない |
| Storage | 口コミ画像 `review-images`（1投稿4枚まで、WebP へ縮小して保存、画像変換でサムネ配信） |
| Migrations / 型生成 | `supabase/migrations/` の14ファイルで再現。`npm run db:types` で型を生成し、CI が差分を検出する |

## Devin の使い方

このリポジトリのコードはすべて Devin が書いている。人間がやったのは仕様の決定と却下、UI 文言の判断。

| 任せたこと | 証拠 |
| --- | --- |
| MVP まるごと（成分ベクトル・ΔE・SQL関数・シード生成器） | [#1](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/1) |
| 指摘18点からの設計案作成 → 合意 → 実装（専門用語の排除、成分の日本語化、認証、画像つき口コミ） | [#4](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/4) |
| 商品ページの比較セクション統合、成分のタブ化 | [#5](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/5) |
| 未ログイン向け紹介ページとログイン後トップの分離 | [#6](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/6) |
| 認証方式の作り直し（コード → リンク＋パスワード） | [#7](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/7) [#8](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/8) [#9](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/9) |
| Issue テンプレートと、**Issue を立てると Devin が自動で調査して修正 PR を出す仕組み** | [#11](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/11) [#17](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/17) / `.github/workflows/devin-on-issue.yml` |
| 上記の自動化で回した性能・セキュリティ・アクセシビリティの改善（trgm 検索、HNSW 索引、IDF の日次再計算、匿名サインイン廃止、型 drift 検出 CI、画像の WebP 化 など） | [#104](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/104) [#113](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/113) [#116](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/116) ほか。Issue 起点の PR が並んでいる |
| ブラウザでの実機確認（全ページ表示・口コミ投稿・ポーチ公開の動作） | Devin のコンピュータ操作で実施 |

エージェントが自走できるようにリポジトリ側も整えている。

- `npm run db:reset` 一発でスキーマ + シードが再現する（判定ロジックの検証がすぐできる）
- `npm run seed:gen`（`scripts/generate_seed.py`）は**決定論的**にシードを生成するので、被り検出の結果が毎回同じ
- `.env.example` に必要な環境変数と、無い場合の挙動を明記
- Issue → Devin セッション → PR → CI が GitHub Actions で自動で回る（`.github/workflows/devin-on-issue.yml`、`.github/workflows/ci.yml`）

## セットアップ

前提: Node.js 20 以上、Docker（ローカル Supabase 用）、Python 3（シードを作り直す場合のみ）。

```bash
npm install
cp .env.example .env.local     # ローカルは npx supabase status のキーを入れる
npx supabase start             # Docker が必要
npm run db:reset               # マイグレーション + シード投入
npm run dev                    # http://localhost:3000
```

期待される状態: `npm run db:reset` の後、ブランド12件・商品38件・色番号52件・口コミ14件・成分85件が入る。
シードを作り直す場合は `npm run seed:gen`（`scripts/generate_seed.py` が決定論的に生成）。

シードの商品・ブランド・口コミはすべて架空。実在商品のデータは使っていない。

| 環境変数 | 必須 | 無いとどうなるか |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | 起動しない |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | 起動しない |
| `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM` | 任意 | 既定で Storage の画像変換を通す。使えない環境は `false` |
| `OPENAI_API_KEY` | 任意 | メイク提案がルールベースにフォールバック（機能は動く） |

Docker が使えない環境では、Supabase クラウドのプロジェクトに `supabase/migrations/` と `supabase/seed.sql` を適用し、`.env.local` にそのプロジェクトの URL と anon key を入れれば動く。

つまずきやすい点:

- `npx supabase start` が失敗する → Docker が起動しているか確認
- ポート 3000 が埋まっている → `npm run dev -- -p 3001`
- バーコードスキャンはカメラ権限が必要（HTTPS か localhost のみ）

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

## 既知の制約

- 商品・ブランド・口コミ・成分はすべて架空の生成データ。実商品の JAN マスタは未接続（バーコードは自前のデモコードで読める）
- 成分辞書（`src/lib/ingredients.ts`）は主要成分のみ。辞書に無い成分は英語のまま出る
- 合うかどうかの判定は肌の状態・肌の色・成分の役割からの推定で、医療・効能の断定はしない
- 公開デプロイは未設定（リポジトリ所有者の権限が必要だったため、ローカル起動で確認）
