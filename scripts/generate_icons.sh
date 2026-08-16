#!/usr/bin/env bash
# KAWANAI のマーク（src/app/icon.svg）から favicon / PWA / OG 画像を書き出す。
# 必要なもの: rsvg-convert (librsvg2-bin), convert (ImageMagick)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
icon="$root/src/app/icon.svg"
out_icons="$root/public/icons"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$out_icons"

# 通常アイコン（角丸そのまま）
rsvg-convert -w 180 -h 180 "$icon" -o "$root/src/app/apple-icon.png"
rsvg-convert -w 192 -h 192 "$icon" -o "$out_icons/icon-192.png"
rsvg-convert -w 512 -h 512 "$icon" -o "$out_icons/icon-512.png"

# favicon.ico（16/32/48 のマルチサイズ）
for size in 16 32 48; do
  rsvg-convert -w "$size" -h "$size" "$icon" -o "$tmp/favicon-$size.png"
done
convert "$tmp/favicon-16.png" "$tmp/favicon-32.png" "$tmp/favicon-48.png" "$root/src/app/favicon.ico"

# maskable（Android のマスクで角が削られても欠けないよう、余白を広く取った全面塗り）
sed -e 's|rx="16"|rx="0"|' -e 's|translate(8 8) scale(2)|translate(16 16) scale(1.333)|' "$icon" > "$tmp/maskable.svg"
rsvg-convert -w 512 -h 512 "$tmp/maskable.svg" -o "$out_icons/icon-maskable-512.png"

# OG デフォルト画像
cat > "$tmp/og.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1f6" />
      <stop offset="1" stop-color="#f7f0ff" />
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8fbe" />
      <stop offset="0.45" stop-color="#ef4383" />
      <stop offset="1" stop-color="#a855f7" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="0" y="0" width="1200" height="12" fill="url(#mark)" />
  <g transform="translate(96 168)">
    <rect width="120" height="120" rx="30" fill="url(#mark)" />
    <g transform="translate(15 15) scale(3.75)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </g>
  </g>
  <text x="248" y="258" font-family="IPAGothic, sans-serif" font-size="96" font-weight="bold" fill="#241d22" letter-spacing="4">KAWANAI</text>
  <text x="96" y="382" font-family="IPAGothic, sans-serif" font-size="52" font-weight="bold" fill="#d92668">そのコスメ、もう持ってるかも</text>
  <text x="96" y="462" font-family="IPAGothic, sans-serif" font-size="32" fill="#5b5158">手持ちコスメと照らし合わせて、重複買いを防ぐアプリ</text>
</svg>
SVG
rsvg-convert -w 1200 -h 630 "$tmp/og.svg" -o "$root/src/app/opengraph-image.png"

echo "generated: favicon.ico, apple-icon.png, opengraph-image.png, public/icons/*"
