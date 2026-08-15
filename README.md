# KAWANAI

「買わなくていい」を、成分と色の数値で証明するアプリ。

LIPS や @cosme は「何を買うか」を決めるアプリ。KAWANAI は手持ちコスメと候補商品を **全成分ベクトル**と **CIELAB の色差 ΔE(CIEDE2000)** で突き合わせ、「それ、もう持っています」「同じ処方でこっちが ¥2,820 安い」を数値で示す。

## 機能

| 機能 | 実装 |
| --- | --- |
| 手持ち登録 / バーコード(JAN)登録 | `/scan`。zxing で読み取り、マスタに無い JAN は候補選択にフォールバック |
| 被り検出 | `find_duplicates_in_stash` / `find_stash_overlaps`（pgvector cosine + ΔE） |
| 安い代替 | `find_cheaper_dupes`（類似スコア閾値 × 価格差） |
| 口コミ信頼度 | `recompute_review_trust`。生評価と補正後評価、除外件数と理由を開示 |
| 画像から色検出 | `/color`。主要色を抽出 → Lab 変換 → `find_by_color` |
| 手持ちだけのメイク提案 | `/stash`。`OPENAI_API_KEY` があれば LLM、無ければルールベース |
| メンズ | シャンプー / トリートメント / BB / 日焼け止めをカテゴリに保持 |

## 成分ベクトル

全成分表示は配合量の多い順に書かれるので、配合順を重みにして 256 次元にハッシュする。

```
w_i = (1 / log2(i + 2)) * idf(ingredient)
```

共通の基剤（水、BG、グリセリンなど）は IDF で寄与を落とす。L2 正規化して pgvector の cosine 距離で比較する。

## 色差

HEX → CIELAB に変換し、CIEDE2000 を Postgres 関数 `lab_delta_e` で計算する。

- ΔE < 1：ほぼ判別不能
- ΔE < 2：並べても見分けにくい
- ΔE < 5：似ている

## 口コミの不正検出

削除はしない。疑わしい口コミは理由付きで残したまま、総合評価から外す。

- 文体の類似クラスタ / 投稿バースト / 同一ブランドへの偏重 / PR定型文 / 画像 pHash の使い回し

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

## デモ用バーコード

シードの JAN は EAN-13 のチェックディジット付きなので、印刷すれば実機のカメラで読める。

```bash
pip install python-barcode reportlab
python scripts/generate_barcodes.py kawanai_barcodes.pdf   # .env.local の Supabase から商品を取得
```

印刷したシートを `/scan` の「カメラでスキャン」で読むと手持ちに登録される。カメラが無い環境では「バーコード画像から読み取る」に写真を渡すか、JAN を手入力する。

## 検証

```bash
npm run lint
npm run typecheck
npm run build
```
