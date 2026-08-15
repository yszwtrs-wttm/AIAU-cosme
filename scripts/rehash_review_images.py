#!/usr/bin/env python3
"""既存の review_images を pHash(DCT) に移行する。

average hash 時代に保存された phash を、Storage の元画像から pHash(DCT) で
再計算して書き戻す。ハッシュは src/lib/phash.ts と同じ手順
（32x32 グレースケール → 2次元 DCT-II → 低周波 8x8 を中央値で二値化）。

    export NEXT_PUBLIC_SUPABASE_URL=...
    export SUPABASE_SERVICE_ROLE_KEY=...
    python3 scripts/rehash_review_images.py            # 何が変わるか表示するだけ
    python3 scripts/rehash_review_images.py --apply    # 実際に更新する

必要なもの: Pillow。
"""

from __future__ import annotations

import argparse
import io
import json
import math
import os
import sys
import urllib.parse
import urllib.request

from PIL import Image

SAMPLE = 32
LOW_FREQ = 8
BUCKET = "review-images"
ALGO = "phash_dct_v1"

COS = [
    [math.cos(((2 * x + 1) * k * math.pi) / (2 * SAMPLE)) for x in range(SAMPLE)]
    for k in range(SAMPLE)
]


def dct_2d(matrix: list[list[float]]) -> list[list[float]]:
    rows = [[sum(row[x] * COS[k][x] for x in range(SAMPLE)) for k in range(SAMPLE)] for row in matrix]
    return [
        [sum(rows[y][x] * COS[k][y] for y in range(SAMPLE)) for x in range(SAMPLE)]
        for k in range(SAMPLE)
    ]


def phash(data: bytes) -> str:
    image = Image.open(io.BytesIO(data)).convert("RGB").resize((SAMPLE, SAMPLE), Image.BILINEAR)
    pixels = list(image.getdata())
    gray = [
        [
            0.299 * pixels[y * SAMPLE + x][0]
            + 0.587 * pixels[y * SAMPLE + x][1]
            + 0.114 * pixels[y * SAMPLE + x][2]
            for x in range(SAMPLE)
        ]
        for y in range(SAMPLE)
    ]
    dct = dct_2d(gray)
    low = [dct[y][x] for y in range(LOW_FREQ) for x in range(LOW_FREQ)]
    ordered = sorted(low)
    median = (ordered[31] + ordered[32]) / 2
    bits = "".join("1" if value > median else "0" for value in low)
    return "".join(f"{int(bits[i : i + 4], 2):x}" for i in range(0, 64, 4))


def request(url: str, key: str, method: str = "GET", body: bytes | None = None) -> bytes:
    req = urllib.request.Request(url, method=method, data=body)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    if body is not None:
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "return=minimal")
    with urllib.request.urlopen(req) as res:
        return res.read()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="実際に DB を更新する")
    parser.add_argument("--limit", type=int, default=1000)
    args = parser.parse_args()

    base = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not key:
        print("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です", file=sys.stderr)
        return 1
    base = base.rstrip("/")

    query = (
        f"{base}/rest/v1/review_images"
        f"?select=id,path,phash,phash_algo&phash_algo=neq.{ALGO}&order=id&limit={args.limit}"
    )
    rows = json.loads(request(query, key))
    print(f"対象 {len(rows)} 件")

    updated = 0
    for row in rows:
        try:
            image = request(f"{base}/storage/v1/object/{BUCKET}/{urllib.parse.quote(row['path'])}", key)
            value = phash(image)
        except Exception as err:  # 画像が消えている / 壊れている場合は飛ばす
            print(f"skip id={row['id']} path={row['path']}: {err}")
            continue

        print(f"id={row['id']} {row.get('phash')} ({row.get('phash_algo')}) -> {value} ({ALGO})")
        if args.apply:
            request(
                f"{base}/rest/v1/review_images?id=eq.{row['id']}",
                key,
                method="PATCH",
                body=json.dumps({"phash": value, "phash_algo": ALGO}).encode(),
            )
            updated += 1

    print(f"更新 {updated} 件" if args.apply else "--apply を付けると更新します")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
