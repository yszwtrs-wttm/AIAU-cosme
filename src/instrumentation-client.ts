import { loadSentry } from "@/lib/sentry-client";

void loadSentry();

export function onRouterTransitionStart(href: string, navigationType: "push" | "replace" | "traverse"): void {
  void loadSentry().then((Sentry) => Sentry?.captureRouterTransitionStart(href, navigationType));
}
