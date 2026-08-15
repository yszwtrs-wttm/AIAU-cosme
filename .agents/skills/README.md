# Skills

「AIっぽいUI」を避けるためのデザインSkill。Devin / Claude Code / Cursor が `SKILL.md` を読んで適用する。

| ディレクトリ | 上流 | commit | License | 使いどころ |
| --- | --- | --- | --- | --- |
| `hallmark/` | [Nutlope/hallmark](https://github.com/Nutlope/hallmark) `skills/hallmark` | `13ac0ec` | MIT | 新規ページの構造から作る。`audit` / `redesign` / `study` の3動詞。マクロ構造カタログ＋57項目のslopテスト |
| `taste-skill/` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) `skills/taste-skill` | `e988add` | MIT | ブリーフ推論と VARIANCE / MOTION / DENSITY の3ダイヤル。モーションまで作り込むとき |
| `kill-ai-slop/` | [yetone/kill-ai-slop](https://github.com/yetone/kill-ai-slop) `skill` | `96d1ca5` | Apache-2.0 | 既存コードの走査と修正。`scripts/scan.mjs` で機械的に検出できる |

## 使い方

```
「hallmark で /stash を作り直して」
「taste-skill、VARIANCE=high MOTION=low でLPを作って」
「kill-ai-slop で src/ を audit して」
```

`kill-ai-slop` のスキャナだけは単体でも動く:

```bash
node .agents/skills/kill-ai-slop/scripts/scan.mjs src
```

## 更新

上流をそのままコピーしている。更新するときは上記リポジトリの該当ディレクトリを再取得し、この表の commit を書き換える。ローカルで手を入れる場合は、どこを変えたかをこのファイルに残す。
