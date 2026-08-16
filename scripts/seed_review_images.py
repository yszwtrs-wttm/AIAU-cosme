#!/usr/bin/env python3
"""Seed review photos and exercise the review trust signals in Supabase."""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "supabase" / "seed-images" / "manifest.json"
IMAGE_DIR = ROOT / "supabase" / "seed-images"


class ApiError(RuntimeError):
    pass


class Supabase:
    def __init__(self, url: str, key: str, dry_run: bool) -> None:
        self.url = url.rstrip("/")
        self.key = key
        self.dry_run = dry_run

    def request(
        self,
        method: str,
        path: str,
        *,
        query: dict[str, str] | None = None,
        body: Any = None,
        headers: dict[str, str] | None = None,
        write: bool = False,
    ) -> Any:
        if self.dry_run and write:
            print(f"[dry-run] {method} {path}")
            return []
        url = f"{self.url}{path}"
        if query:
            url += f"?{urlencode(query)}"
        request_headers = {
            "Authorization": f"Bearer {self.key}",
            "apikey": self.key,
        }
        if body is not None:
            if isinstance(body, bytes):
                payload = body
            else:
                request_headers["Content-Type"] = "application/json"
                payload = json.dumps(body, ensure_ascii=False).encode()
        else:
            payload = None
        request_headers.update(headers or {})
        request = Request(url, data=payload, headers=request_headers, method=method)
        try:
            with urlopen(request) as response:
                raw = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", "replace")
            raise ApiError(f"{method} {path} -> {error.code}: {detail}") from error
        if not raw:
            return []
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw

    def rest(self, table: str, method: str = "GET", **kwargs: Any) -> Any:
        return self.request(method, f"/rest/v1/{table}", **kwargs)

    def storage(self, path: str, method: str = "POST", data: bytes | None = None) -> Any:
        encoded = quote(path, safe="/")
        return self.request(
            method,
            f"/storage/v1/object/review-images/{encoded}",
            body=data if method == "POST" else None,
            headers={"Content-Type": "image/webp", "x-upsert": "true"} if method == "POST" else None,
            write=True,
        )


def average_hash(data: bytes) -> str:
    with Image.open(io.BytesIO(data)) as image:
        image = image.convert("RGB").resize((8, 8), Image.Resampling.LANCZOS)
        gray = [
            0.299 * red + 0.587 * green + 0.114 * blue
            for red, green, blue in image.getdata()
        ]
    mean = sum(gray) / len(gray)
    return "".join(
        f"{sum((gray[offset + bit] > mean) << (3 - bit) for bit in range(4)):x}"
        for offset in range(0, 64, 4)
    )


def one(rows: list[dict[str, Any]], description: str) -> dict[str, Any]:
    if len(rows) != 1:
        raise ApiError(f"{description}: {len(rows)} 件（1 件に特定できません）")
    return rows[0]


def like_pattern(value: str) -> str:
    return value.replace("%", "*")


def posted_at(ago: str) -> str:
    match = re.fullmatch(r"(\d+)\s+(minutes?|hours?|days?)", ago)
    if not match:
        raise ValueError(f"posted_ago の形式が不正です: {ago}")
    amount = int(match.group(1))
    unit = match.group(2)
    seconds = amount * (60 if unit.startswith("minute") else 3600 if unit.startswith("hour") else 86400)
    return (datetime.now(timezone.utc) - timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    base_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not service_key:
        print("SUPABASE_URL (または NEXT_PUBLIC_SUPABASE_URL) と SUPABASE_SERVICE_ROLE_KEY が必要です", file=sys.stderr)
        return 2

    manifest = json.loads(MANIFEST.read_text())
    api = Supabase(base_url, service_key, args.dry_run)
    owner = one(
        api.rest("profiles", query={"select": "user_id", "handle": f"eq.{manifest['owner_handle']}"}),
        "owner_handle",
    )
    owner_id = owner["user_id"]
    deleted = updated = added = uploaded = 0
    touched_products: set[int] = set()

    patterns = ",".join(f"body.like.{like_pattern(pattern)}" for pattern in manifest["delete_review_body_patterns"])
    rows = api.rest("reviews", query={"select": "id,body", "or": f"({patterns})"})
    for review in rows:
        images = api.rest("review_images", query={"select": "path", "review_id": f"eq.{review['id']}"})
        for image in images:
            api.storage(image["path"], "DELETE")
        api.rest("reviews", "DELETE", query={"id": f"eq.{review['id']}"}, write=True)
        deleted += 1

    def resolve_product(entry: dict[str, Any]) -> int:
        brand = one(
            api.rest("brands", query={"select": "id", "name": f"eq.{entry['brand']}"}),
            f"brand {entry['brand']}",
        )
        product = one(
            api.rest(
                "products",
                query={
                    "select": "id",
                    "brand_id": f"eq.{brand['id']}",
                    "name": f"like.{like_pattern(entry['product_like'])}",
                },
            ),
            f"product {entry['brand']} / {entry['product_like']}",
        )
        return product["id"]

    def attach(review_id: int, image_keys: list[str]) -> None:
        nonlocal uploaded
        old = api.rest("review_images", query={"select": "path", "review_id": f"eq.{review_id}"})
        for image in old:
            api.storage(image["path"], "DELETE")
        api.rest("review_images", "DELETE", query={"review_id": f"eq.{review_id}"}, write=True)
        for pos, key in enumerate(image_keys):
            data = (IMAGE_DIR / f"{key}.webp").read_bytes()
            path = f"{owner_id}/{review_id}-{pos}.webp"
            api.storage(path, data=data)
            api.rest(
                "review_images",
                "POST",
                body={"review_id": review_id, "user_id": owner_id, "path": path, "pos": pos, "phash": average_hash(data)},
                headers={"Prefer": "return=minimal"},
                write=True,
            )
            uploaded += 1

    for entry in manifest["existing"]:
        product_id = resolve_product(entry)
        query = {
            "select": "id",
            "product_id": f"eq.{product_id}",
            "body": f"like.{like_pattern(entry['body_prefix'])}*",
        }
        if entry["author_name"] is not None:
            query["author_name"] = f"eq.{entry['author_name']}"
        review_id = one(api.rest("reviews", query=query), f"existing review {entry['body_prefix']}")["id"]
        if args.dry_run:
            print(f"[dry-run] 口コミ {review_id} に写真 {', '.join(entry['images'])} を添付")
        else:
            attach(review_id, entry["images"])
        updated += 1
        touched_products.add(product_id)

    for entry in manifest["new"]:
        product_id = resolve_product(entry)
        query = {
            "select": "id",
            "product_id": f"eq.{product_id}",
            "author_name": f"eq.{entry['author_name']}",
            "body": f"eq.{entry['body']}",
        }
        rows = api.rest("reviews", query=query)
        if rows:
            review_id = one(rows, f"new review {entry['author_name']}")["id"]
        else:
            if args.dry_run:
                print(
                    f"[dry-run] 新規口コミ {entry['author_name']} / {entry['brand']} "
                    f"に写真 {', '.join(entry['images'])} を添付"
                )
                touched_products.add(product_id)
                continue
            created = api.rest(
                "reviews",
                "POST",
                body={
                    "product_id": product_id,
                    "author_name": entry["author_name"],
                    "author_key": entry["author_name"],
                    "rating": entry["rating"],
                    "body": entry["body"],
                    "posted_at": posted_at(entry["posted_ago"]),
                },
                headers={"Prefer": "return=representation"},
                write=True,
            )
            review_id = one(created, f"created review {entry['author_name']}")["id"]
            added += 1
        if args.dry_run:
            print(f"[dry-run] 口コミ {review_id} に写真 {', '.join(entry['images'])} を添付")
        else:
            attach(review_id, entry["images"])
        touched_products.add(product_id)

    for product_id in touched_products:
        api.request(
            "POST",
            "/rest/v1/rpc/recompute_review_trust",
            body={"p_product_id": product_id},
            write=True,
        )

    print(f"削除 {deleted} 件 / 更新 {updated} 件 / 追加 {added} 件 / アップロード {uploaded} 枚")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
