export type WebsiteStatus = "none" | "broken" | "weak" | "ok" | "unchecked";

/**
 * Checks a business website for basic health signals.
 * Deliberately lightweight (HEAD/GET with timeout) — this runs per-lead
 * so it needs to be fast and not hang the batch on slow/dead sites.
 */
export async function checkWebsite(url: string | null | undefined): Promise<WebsiteStatus> {
  if (!url || url.trim() === "") return "none";

  let target = url.trim();
  if (!target.startsWith("http://") && !target.startsWith("https://")) {
    target = `https://${target}`;
  }

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

    if (!res.ok) return "broken";

    const html = (await res.text()).toLowerCase();

    // Heuristics for a "weak" site — parked domain, placeholder, or barebones
    const weakSignals = [
      "domain is for sale",
      "this domain is parked",
      "coming soon",
      "under construction",
      "godaddy.com/domains",
      "default web site page",
    ];
    if (weakSignals.some((signal) => html.includes(signal))) return "weak";

    // No mobile viewport meta tag = likely an old/neglected site
    const hasViewport = html.includes('name="viewport"');
    if (!hasViewport) return "weak";

    return "ok";
  } catch {
    // Timeout, DNS failure, connection refused, etc. — treat as broken
    return "broken";
  }
}
