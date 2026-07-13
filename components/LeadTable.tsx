"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageCircle, Globe, GlobeLock, Star, ExternalLink } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  category: string;
  country: string;
  city: string;
  website: string | null;
  website_status: string;
  whatsapp_link: string | null;
  phone_e164: string | null;
  running_ads: boolean;
  rating: number | null;
  reviews_count: number | null;
  detected_need: string;
  score: number;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["new", "contacted", "replied", "won", "dead", "skip"];

const STATUS_COLORS: Record<string, string> = {
  new: "text-[var(--accent)] bg-[var(--accent-dim)]",
  contacted: "text-[var(--warn)] bg-[#3a2f14]",
  replied: "text-[#60a5fa] bg-[#1a2a3a]",
  won: "text-[#4ade80] bg-[#1a3324]",
  dead: "text-[var(--text-dim)] bg-[var(--bg)]",
  skip: "text-[var(--text-dim)] bg-[var(--bg)]",
};

function scoreColor(score: number) {
  if (score >= 70) return "text-[var(--accent)]";
  if (score >= 45) return "text-[var(--warn)]";
  return "text-[var(--text-dim)]";
}

interface Props {
  refreshKey: number;
}

export default function LeadTable({ refreshKey }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ country: "", status: "", minScore: "" });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.status) params.set("status", filters.status);
    if (filters.minScore) params.set("minScore", filters.minScore);

    fetch(`/api/leads?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setLeads(d.leads || []))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(load, [load, refreshKey]);

  async function updateStatus(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
  }

  const countries = [...new Set(leads.map((l) => l.country))];

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[var(--border)]">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.country}
          onChange={(e) => setFilters({ ...filters, country: e.target.value })}
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filters.minScore}
          onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
        >
          <option value="">Any score</option>
          <option value="70">Score 70+</option>
          <option value="45">Score 45+</option>
        </select>
        <span className="ml-auto text-xs text-[var(--text-dim)]">
          {loading ? "Loading…" : `${leads.length} leads`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[var(--text-dim)] border-b border-[var(--border)]">
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Business</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Signal</th>
              <th className="px-3 py-2 font-medium">Detected need</th>
              <th className="px-3 py-2 font-medium">Contact</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-[var(--bg)] transition align-top">
                <td className="px-3 py-2.5">
                  <span className={`font-mono font-medium ${scoreColor(lead.score)}`}>
                    {lead.score}
                  </span>
                </td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <div className="font-medium truncate">{lead.name}</div>
                  <div className="text-xs text-[var(--text-dim)]">{lead.category}</div>
                  {lead.rating && (
                    <div className="flex items-center gap-1 text-xs text-[var(--text-dim)] mt-0.5">
                      <Star size={10} className="fill-current" />
                      {lead.rating} ({lead.reviews_count || 0})
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-[var(--text-dim)]">
                  {lead.city}
                  <br />
                  {lead.country}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="flex items-center gap-1">
                      {lead.website_status === "none" ? (
                        <>
                          <GlobeLock size={12} className="text-[var(--danger)]" />
                          <span className="text-[var(--danger)]">no site</span>
                        </>
                      ) : lead.website_status === "ok" ? (
                        <>
                          <Globe size={12} className="text-[var(--text-dim)]" />
                          <span className="text-[var(--text-dim)]">has site</span>
                        </>
                      ) : (
                        <>
                          <Globe size={12} className="text-[var(--warn)]" />
                          <span className="text-[var(--warn)]">{lead.website_status} site</span>
                        </>
                      )}
                    </span>
                    {lead.running_ads && (
                      <span className="text-[var(--accent)]">running ads</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 max-w-[220px] text-xs text-[var(--text-dim)]">
                  {lead.detected_need}
                </td>
                <td className="px-3 py-2.5">
                  {lead.whatsapp_link ? (
                    <a
                      href={lead.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      <MessageCircle size={12} />
                      {lead.phone_e164}
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--text-dim)]">no number</span>
                  )}
                  {lead.website && (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--text-dim)] hover:underline mt-1"
                    >
                      <ExternalLink size={10} /> site
                    </a>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className={`rounded px-2 py-1 text-xs border-0 ${STATUS_COLORS[lead.status] || ""}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && leads.length === 0 && (
          <div className="text-center py-12 text-sm text-[var(--text-dim)]">
            No leads yet. Add target queries below and run a batch to populate this list.
          </div>
        )}
      </div>
    </div>
  );
}
