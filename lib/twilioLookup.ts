/**
 * Twilio Lookup v2 — used ONLY for US/Canada numbers, where the numbering
 * plan itself doesn't distinguish mobile from landline (unlike UK/AU/UAE,
 * which use structural prefixes we can classify for free in phone.ts).
 *
 * Cost: ~$0.005 (half a cent) per lookup with the "line_type_intelligence"
 * field. Your Twilio trial's $15 credit covers roughly 3,000 lookups.
 *
 * Docs: https://www.twilio.com/docs/lookup/v2-api/line-type-intelligence
 */

export type TwilioLineType = "mobile" | "landline" | "unknown";

export async function lookupLineTypeTwilio(
  e164Phone: string
): Promise<TwilioLineType> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    // Not configured — caller should fall back to "unknown" rather than fail
    return "unknown";
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(
      e164Phone
    )}?Fields=line_type_intelligence`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!res.ok) return "unknown";

    const data = await res.json();
    const type: string | undefined = data?.line_type_intelligence?.type;

    // Twilio returns types like "mobile", "landline", "fixedVoip", "nonFixedVoip", "personal", "tollFree", "premium"
    if (type === "mobile") return "mobile";
    if (type === "landline") return "landline";
    return "unknown"; // VoIP and other types are ambiguous for WhatsApp purposes
  } catch {
    return "unknown";
  }
}
