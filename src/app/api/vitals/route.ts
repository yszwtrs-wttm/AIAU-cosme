import { captureMetric } from "@/lib/observability";

type Vital = { name?: string; value?: number; rating?: string; path?: string };

const ALLOWED = new Set(["LCP", "INP", "CLS", "TTFB", "FCP"]);

/** クライアントから送られたコアウェブバイタルをログに記録する。 */
export async function POST(request: Request): Promise<Response> {
  let vital: Vital;
  try {
    vital = (await request.json()) as Vital;
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!vital.name || !ALLOWED.has(vital.name) || typeof vital.value !== "number") {
    return new Response(null, { status: 400 });
  }

  captureMetric(`web-vitals.${vital.name}`, Math.round(vital.value), {
    rating: vital.rating ?? null,
    path: typeof vital.path === "string" ? vital.path.slice(0, 120) : null,
  });

  return new Response(null, { status: 204 });
}
