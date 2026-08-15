"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";

const WATCHED = new Set(["LCP", "INP", "CLS", "TTFB", "FCP"]);

/**
 * LCP / INP などのコアウェブバイタルを計測して /api/vitals に送る。
 * 送信はページ遷移や離脱でも落とさないように sendBeacon を使う。
 */
export default function WebVitals() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    if (!WATCHED.has(metric.name)) return;

    const body = JSON.stringify({
      name: metric.name,
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      path: pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/vitals", { method: "POST", body, keepalive: true });
  });

  return null;
}
