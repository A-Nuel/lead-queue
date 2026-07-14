/**
 * AI website review using DeepSeek (V4 Flash — cheap, ~$0.14/M input tokens).
 * This replaces guessing from raw heuristics (missing viewport tag, parked-domain
 * strings) with an actual judgment call on whether the site looks like a real,
 * maintained business site or something worth pitching a rebuild/automation for.
 *
 * Falls back to "unchecked" if DEEPSEEK_API_KEY isn't set, so the rest of the
 * pipeline still works without it.
 */

export interface AiSiteReview {
  verdict: "none" | "broken" | "weak" | "ok";
  reasoning: string;
}

export async function reviewWebsiteWithAI(
  url: string,
  htmlSnippet: string
): Promise<AiSiteReview | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null; // caller should fall back to heuristic-only check

  // Trim aggressively — we only need enough to judge quality, not the whole page.
  // Keeps token cost near-zero (a few hundred tokens per lead).
  const trimmed = htmlSnippet.slice(0, 6000);

  const prompt = `You are evaluating a small/medium business website to decide if the business needs a new website or automation help.

URL: ${url}

Raw HTML (truncated):
${trimmed}

Judge the site and respond with ONLY a JSON object, no other text, in this exact shape:
{"verdict": "none" | "broken" | "weak" | "ok", "reasoning": "one short sentence"}

Guidance:
- "broken": page errored, empty, or clearly not loading real content
- "weak": parked domain, coming-soon page, template never customized, no real business info, very outdated design/tech, or just a single social media link page (linktree-style) with no real site
- "ok": has real business content, looks maintained and functional, even if simple
- "none": the HTML shows no real site content at all (essentially blank)`;

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat", // V4 Flash — cheap, fast, sufficient for this classification task
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 150,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    // Strip markdown fences if the model wraps its JSON despite instructions
    const clean = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!["none", "broken", "weak", "ok"].includes(parsed.verdict)) return null;

    return { verdict: parsed.verdict, reasoning: parsed.reasoning || "" };
  } catch {
    return null;
  }
}
