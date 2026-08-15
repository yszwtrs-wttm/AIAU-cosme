# KAWANAI

**「本当に自分に合うもの」を成分と色の数値で見つけるコスメ判断アプリ。**

LIPS や @cosme は「何が人気か」を教えてくれる。KAWANAI は手持ちコスメとプロフィール（肌の状態・肌の色）を持っているので、
気になった商品について **「あなたに合うか」「もう似たものを持っていないか」「似ていて安いものはあるか、でも高い方の良さは何か」** を数値で判定して見せる。
判定の材料は全成分表示（配合順）と色の実測値（CIELAB / ΔE CIEDE2000）で、口コミは信用できるものだけを集計に入れる。

- 3日間のハッカソン（AIAU Craft Day）で開発。Supabase と Devin を使用。
- 実装はすべて Devin のセッション経由（PR 13本 / うち10本マージ）。人間は仕様と judge を担当。

## 審査項目とこの README の対応

| 審査項目 | 該当セクション |
| --- | --- |
| スポンサーツール活用度（Supabase / Devin） | [Supabase の使い方](#supabase-の使い方) / [Devin の使い方](#devin-の使い方) |
| 完成度 / 動作 | [デモ](#デモ) / [動かし方](#動かし方) / [動作確認](#動作確認) |
| アイデア / 独創性 | [判定の仕組み](#判定の仕組み) |
| 課題解決 / インパクト | [解きたい課題](#解きたい課題) |
| プレゼンテーション | [機能](#機能)（画面ごとに何が起きるか） |

## デモ

<!-- TODO: 公開URL・デモ動画・スクリーンショットを貼る -->
- 公開URL: （準備中）
- デモ動画（30〜60秒）: （準備中）
- ローカルで見る場合は [動かし方](#動かし方) の 5 コマンドで起動する。ログイン不要で `/search`・商品ページ・`/color`・`/feed` は閲覧できる。

3分で価値が伝わる動線:

1. `/search` で商品を探す（信用できる口コミの評価が高い順に並ぶ）
2. 商品ページ上部で「あなたに合いそう／少し注意」と理由を読む
3. 同じページの比較セクションで「似ていて安い商品」との使い心地チャートと価格差を見る
4. `/color` に手持ちリップの写真を上げて、近い色の商品を探す
5. `/stash` で手持ちだけで組めるメイクを提案させる

## 解きたい課題

コスメは「持っているのに買う」が起きやすい。色番号の違いは店頭では判別できず、成分（＝中身）は英語の羅列で読めないため、
値段の差が中身の差なのか、ブランドの差なのか判断できない。既存の口コミアプリは「買う理由」を増やす方向にしか働かない。

KAWANAI が答えるのは次の4つ。

- この商品は**自分の肌の状態と肌の色に合うか**（`src/lib/fit.ts`）
- **もう似たものを持っていないか**（成分 cosine + ΔE、`find_duplicates_in_stash`）
- **似ていて安いものはないか**（`find_cheaper_dupes`）
- それでも**高い方に良さはあるか**（使い心地5軸の差分、`src/lib/compare.ts`）

「買わない」ためのアプリではなく、無駄を削って本当に必要なものに予算を回すためのアプリ。

## 機能

| 画面 / 機能 | 実装 |
| --- | --- |
| トップ | `/`。未ログイン（匿名セッション含む）は紹介ページ、本アカウントは肌情報・ポーチをもとにしたおすすめ |
| 商品を探す | `/search`。商品名検索・カテゴリ・メンズ絞り込み。信用できる口コミの評価が高い順 |
| 合うかどうかの判定 | 商品ページ上部（`src/components/FitCard.tsx`）。肌の状態×成分の役割、肌の色に近い色番号を提示。判定できない時は言い切らない |
| 似ていて安い物との比較 | `src/components/ComparePanel.tsx`。使い心地5軸のチャートで横並び、価格差と成分の違いを1行で。高い方の良さも同じ大きさで出す |
| 手持ち登録 | `/scan`（本アカウント限定）。人気商品のチェックリストで一括登録 + zxing の連続バーコードスキャン |
| 被り検出 | `find_duplicates_in_stash` / `find_stash_overlaps`（pgvector cosine + ΔE） |
| 安い代替 | `find_cheaper_dupes`（類似スコア閾値 × 価格差） |
| 口コミの重み付け集計 | `recompute_review_trust`。信用できない口コミは削除せず平均から外す。スコアと除外理由は画面に出さない |
| 画像から色検出 | `/color`。主要色を抽出 → Lab 変換 → `find_by_color`。色名・系統・肌トーン順で提示 |
| 手持ちだけのメイク提案 | `/stash`（本アカウント限定）。`OPENAI_API_KEY` があれば LLM、無ければルールベース |
| 認証 / プロフィール | `/login`（初回はメールのリンクで確認し、プロフィール作成画面でパスワードを設定。以降はメールアドレス＋パスワードでログイン）、`/settings`、`/me`、`/u/[handle]` |
| 画像つき口コミ | `/feed`。1投稿4枚まで、Supabase Storage の `review-images` に保存 |
| 成分の日本語化 | `src/lib/ingredients.ts` の辞書で日本語名・役割・効果に変換（INCI の英語をそのまま出さない） |
| 使用感 | `src/lib/feel.ts`。口コミのスライダー平均、無ければ配合順からの推定 |
| メンズ | シャンプー / トリートメント / BB / 日焼け止めをカテゴリに保持 |

## 判定の仕組み

### 成分ベクトル

全成分表示は配合量の多い順に書かれるので、**配合順を重みにして** 256 次元にハッシュする。

```
w_i = (1 / log2(i + 2)) * idf(ingredient)
```

共通の基剤（水、BG、グリセリンなど）は IDF で寄与を落とす。L2 正規化して pgvector の cosine 距離で比較する。
ベクトル生成は Postgres 側の `build_ingredient_vec` + トリガで、商品を入れれば自動で計算される。

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

削除はしない。疑わしい口コミは残したまま、総合評価の集計から外す。

- 文体の類似クラスタ / 投稿バースト / 同一ブランドへの偏重 / PR定型文 / 画像 pHash の使い回し（`src/lib/phash.ts`）

投稿ゲート: 匿名セッションは不可（本アカウント必須）、1日5件・同一ブランド1日2件・1商品1件まで。通報3件で総合評価から除外（削除はしない）。
手持ち登録済みの人の口コミは集計時に少し重く見る（`trust_score * 1.3`）。これらは**すべて DB のトリガと関数で強制**していて、アプリ側の実装ミスで抜けない。

## Supabase の使い方

CRUD だけでなく、**判定ロジック自体を Postgres 側に置いている**。

| 使った機能 | 用途 |
| --- | --- |
| Postgres + pgvector | 成分ベクトル `vector(256)` と cosine 距離での類似検索（`20260815000400_ingredient_vector.sql`） |
| Postgres 関数 | `lab_delta_e`（CIEDE2000 を SQL で実装）、`dupe_score`、`find_duplicates_in_stash`、`find_cheaper_dupes`、`find_stash_overlaps`、`find_by_color`、`find_palette_coverage`、`recompute_review_trust` |
| トリガ | 商品登録で成分ベクトル生成、色の HEX → Lab 変換、口コミ投稿でレート制限・信頼度再計算・画像枚数制限 |
| RLS / セキュリティ | 投稿条件とレート制限を DB 側で強制（`20260815000600_review_policies.sql`、`20260815000700_harden_functions.sql`） |
| Auth | メールのリンクで初回確認 → パスワード設定、以降パスワードログイン。匿名セッションで閲覧のみ許可 |
| Storage | 口コミ画像 `review-images`（1投稿4枚まで） |
| Migrations | `supabase/migrations/` に11ファイル。`npm run db:reset` で誰でも同じ状態を再現できる |

## Devin の使い方

このリポジトリのコードは**すべて Devin が書いている**。人間がやったのは仕様の決定と却下、UI 文言の判断。

| 任せたこと | 証拠 |
| --- | --- |
| MVP まるごと（成分ベクトル・ΔE・SQL関数・シード生成器） | [#1](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/1) |
| 指摘18点からの設計案作成 → 合意 → 実装（専門用語の排除、成分の日本語化、認証、画像つき口コミ） | [#4](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/4) |
| 商品ページの比較セクション統合、成分のタブ化 | [#5](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/5) |
| 未ログイン向け紹介ページとログイン後トップの分離 | [#6](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/6) |
| 認証方式の作り直し（コード → リンク＋パスワード） | [#7](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/7) [#8](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/8) [#9](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/9) |
| Issue テンプレートと、**Issue を立てると Devin が自動で調査・修正 PR を出す仕組み** | [#11](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/11) [#17](https://github.com/yszwtrs-wttm/AIAU-cosme/pull/17) / `.github/workflows/devin-on-issue.yml` |
| ブラウザでの実機確認（全ページ表示・口コミ投稿・ポーチ公開の動作） | Devin のコンピュータ操作で実施 |

エージェントが自走できるようにリポジトリ側も整えている。

- `npm run db:reset` 一発でスキーマ + シードが再現する（判定ロジックの検証がすぐできる）
- `npm run seed:gen`（`scripts/generate_seed.py`）は**決定論的**にシードを生成するので、被り検出の結果が毎回同じ
- `.env.example` に必要な環境変数と、無い場合の挙動を明記
- Issue → Devin セッション → PR が GitHub Actions で自動で回る（`.github/workflows/devin-on-issue.yml`）

## 動かし方

前提: Node.js 20 以上、Docker（ローカル Supabase 用）、Python 3（シード再生成する場合のみ）。

```bash
npm install
cp .env.example .env.local     # ローカルは npx supabase status のキーを入れる
npx supabase start             # Docker が必要
npm run db:reset               # マイグレーション + シード投入
npm run dev                    # http://localhost:3000
```

期待される状態: `npm run db:reset` の後、ブランド12件・商品38件・色番号52件・口コミ14件が入る（すべて架空データ。実在商品のデータは使っていない）。

| 環境変数 | 必須 | 無いとどうなるか |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 必須 | 起動しない |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必須 | 起動しない |
| `OPENAI_API_KEY` | 任意 | メイク提案がルールベースにフォールバック（機能は動く） |

Docker が使えない環境では、Supabase クラウドのプロジェクトに `supabase/migrations/` と `supabase/seed.sql` を適用し、`.env.local` にそのプロジェクトの URL と anon key を入れれば動く。

つまずきやすい点:

- `npx supabase start` が失敗する → Docker Desktop が起動しているか確認
- ポート 3000 が埋まっている → `npm run dev -- -p 3001`
- バーコードスキャンはカメラ権限が必要（HTTPS か localhost のみ）

## 動作確認

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
