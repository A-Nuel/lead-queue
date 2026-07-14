export type WebsiteStatus = "none" | "broken" | "weak" | "ok" | "unchecked";

export interface WebsiteCheckResult {
  status: WebsiteStatus;
  html: string | null; // raw HTML, only kept for a possible AI review pass — not stored in DB
  aiReasoning?: string;
}

/**
 * Checks a business website for basic health signals, then (if configured)
 * asks an AI model to judge the actual content quality — since raw heuristics
 * alone (missing viewport tag, parked-domain strings) produce false positives
 * on sites that are real but just don't hit those specific signals.
 */
export async function checkWebsite(url: string | null | undefined): Promise<WebsiteCheckResult> {
  if (!url || url.trim() === "") return { status: "none", html: null };

  let target = url.trim();
  if (!target.startsWith("http://") && !target.startsWith("https://")) {
    target = `https://${target}`;
  }

  let html = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LeadResearchBot/1.0; +https://example.com/bot)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return { status: "broken", html: null };

    html = await res.text();
    const lower = html.toLowerCase();

    // Heuristics for a "weak" site — parked domain, placeholder, or barebones.
    // These remain as a fast, free first pass before spending an AI call.
    const weakSignals = [
      "domain is for sale",
      "this domain is parked",
      "coming soon",
      "under construction",
      "godaddy.com/domains",
      "default web site page",
    ];
    const heuristicWeak = weakSignals.some((signal) => lower.includes(signal));
    const hasViewport = lower.includes('name="viewport"');

    // Try an AI pass for a real judgment call — this catches sites the
    // heuristics get wrong in both directions (calling a real site "weak"
    // just because it lacks a viewport tag, or missing a genuinely dead
    // template that doesn't match any of our weak-signal strings).
    const { reviewWebsiteWithAI } = await import("./aiSiteReview");
    const aiResult = await reviewWebsiteWithAI(target, html);

    if (aiResult) {
      return { status: aiResult.verdict, html, aiReasoning: aiResult.reasoning };
    }

    // No AI configured — fall back to the original heuristic-only logic
    if (heuristicWeak) return { status: "weak", html };
    if (!hasViewport) return { status: "weak", html };
    return { status: "ok", html };
  } catch {
    // Timeout, DNS failure, connection refused, etc. — treat as broken
    return { status: "broken", html: null };
  }
}
