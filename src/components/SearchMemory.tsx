"use client";

import { useEffect } from "react";
import { readScrollTop, rememberScrollTop, rememberSearchQuery } from "@/lib/browsing";

/**
 * 商品詳細から戻ったときに同じ位置・同じ絞り込みで続けられるようにする。
 * 一覧は都度サーバーで作り直されるので、描画が伸びるのを待ってから位置を戻す。
 */
export default function SearchMemory({ query }: { query: string }) {
  useEffect(() => {
    rememberSearchQuery(query);
  }, [query]);

  useEffect(() => {
    const key = `search?${query}`;
    const target = readScrollTop(key);
    let frame = 0;
    let attempts = 0;

    if (target > 0) {
      const restore = () => {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (max >= target || attempts > 40) {
          window.scrollTo(0, Math.min(target, max));
          return;
        }
        attempts += 1;
        frame = requestAnimationFrame(restore);
      };
      frame = requestAnimationFrame(restore);
    }

    const save = () => rememberScrollTop(key, Math.round(window.scrollY));
    let pending = 0;
    const onScroll = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        save();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", onScroll);
      save();
    };
  }, [query]);

  return null;
}
