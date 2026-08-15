"""デモ用のバーコードシート（PDF）を作る。

Supabase の REST から商品を読み、JAN を EAN-13 として印刷する。
印刷したものをアプリの「バーコード登録」でスキャンすると手持ちに入る。

    python scripts/generate_barcodes.py [出力先.pdf]
"""

import io
import json
import os
import sys
import urllib.parse
import urllib.request

import barcode
from barcode.writer import ImageWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

JP_FONT = "HeiseiKakuGo-W5"

CATEGORY_LABEL = {
    "lip": "リップ",
    "eyeshadow": "アイシャドウ",
    "foundation": "ファンデーション",
    "shampoo": "シャンプー",
    "treatment": "トリートメント",
    "sunscreen": "日焼け止め",
    "bb": "BBクリーム",
}


def load_env(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def fetch_products():
    base = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    query = urllib.parse.urlencode({
        "select": "id,name,category,price_yen,jan,brands(name)",
        "order": "id",
    })
    req = urllib.request.Request(
        f"{base}/rest/v1/products?{query}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.load(res)


def barcode_png(jan):
    buf = io.BytesIO()
    barcode.get("ean13", jan[:12], writer=ImageWriter()).write(
        buf,
        {
            "module_width": 0.33,
            "module_height": 14.0,
            "font_size": 9,
            "text_distance": 4.0,
            "quiet_zone": 3.0,
        },
    )
    buf.seek(0)
    return ImageReader(buf)


def main():
    load_env(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
    out = sys.argv[1] if len(sys.argv) > 1 else "kawanai_barcodes.pdf"
    products = fetch_products()

    pdfmetrics.registerFont(UnicodeCIDFont(JP_FONT))
    c = canvas.Canvas(out, pagesize=A4)
    page_w, page_h = A4

    cols, rows = 2, 5
    margin = 12 * mm
    cell_w = (page_w - margin * 2) / cols
    cell_h = (page_h - margin * 2) / rows

    for index, p in enumerate(products):
        slot = index % (cols * rows)
        if slot == 0 and index:
            c.showPage()
        col, row = slot % cols, slot // cols
        x = margin + col * cell_w
        y = page_h - margin - (row + 1) * cell_h

        c.setStrokeColorRGB(0.85, 0.85, 0.85)
        c.rect(x + 3 * mm, y + 3 * mm, cell_w - 6 * mm, cell_h - 6 * mm)

        c.setFont(JP_FONT, 8)
        c.setFillColorRGB(0.45, 0.45, 0.45)
        brand = (p.get("brands") or {}).get("name", "")
        c.drawString(x + 8 * mm, y + cell_h - 12 * mm,
                     f"{brand}・{CATEGORY_LABEL.get(p['category'], p['category'])}")

        c.setFont(JP_FONT, 11)
        c.setFillColorRGB(0, 0, 0)
        c.drawString(x + 8 * mm, y + cell_h - 18 * mm, p["name"])
        c.setFont(JP_FONT, 9)
        c.drawString(x + 8 * mm, y + cell_h - 24 * mm, f"¥{p['price_yen']:,}")

        c.drawImage(
            barcode_png(p["jan"]),
            x + 8 * mm,
            y + 7 * mm,
            width=cell_w - 26 * mm,
            height=cell_h - 34 * mm,
            preserveAspectRatio=True,
            anchor="sw",
        )

    c.save()
    print(f"{len(products)} products -> {out}")


if __name__ == "__main__":
    main()
