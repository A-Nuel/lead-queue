import { WebsiteStatus } from "./websiteCheck";

export interface ScoreInput {
  websiteStatus: WebsiteStatus;
  runningAds: boolean;
  rating?: number | null;
  reviewsCount?: number | null;
  lineType?: "mobile" | "landline" | "unknown";
}

export interface ScoreResult {
  score: number; // 0-100
  detectedNeed: string;
}

/**
 * Rule-based qualification. No ML needed — the signals are simple enough
 * that explicit rules are more predictable and debuggable than a model.
 */
export function scoreAndDetectNeed(input: ScoreInput): ScoreResult {
  const { websiteStatus, runningAds, rating, reviewsCount, lineType = "unknown" } = input;

  let score = 0;
  let need = "";

  if (websiteStatus === "none") {
    score += 50;
    need = runningAds
      ? "Running ads with no website — losing conversions, needs a landing page + booking flow"
      : "No website — needs a basic site + WhatsApp/booking automation";
  } else if (websiteStatus === "broken") {
    score += 45;
    need = "Website is down/unreachable — urgent fix or rebuild needed";
  } else if (websiteStatus === "weak") {
    score += 35;
    need = runningAds
      ? "Outdated/parked site while running ads — ad spend likely wasted, needs a real site"
      : "Outdated or placeholder site — needs a refresh + automation (bookings/inquiries)";
  } else if (websiteStatus === "ok") {
    score += 10;
    need = "Has a working site — potential fit for automation (booking, WhatsApp inquiries, CRM) rather than a full rebuild";
  } else {
    need = "Website status unchecked";
  }

  // Ads running = has marketing budget = more likely to pay for services
  if (runningAds) score += 20;

  // Established business signals (has reviews, decent rating) = more likely
  // to have real revenue and be worth the pitch, vs a brand-new/dead listing
  if (reviewsCount && reviewsCount > 10) score += 10;
  if (rating && rating >= 4.0) score += 10;

  // This pipeline is built for WhatsApp outreach — a confirmed landline
  // can't receive WhatsApp messages at all, so heavily penalize and flag it.
  if (lineType === "landline") {
    score = Math.round(score * 0.3);
    need = `${need} (⚠ landline number — can't be reached on WhatsApp)`;
  }

  // Cap at 100
  score = Math.min(score, 100);

  return { score, detectedNeed: need };
}
