"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageCircle,
  Globe,
  GlobeLock,
  Star,
  ExternalLink,
  PhoneOff,
  Smartphone,
} from "lucide-react";

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
  line_type: "mobile" | "landline" | "unknown";
  running_ads: boolean;
  rating: number | null;
  reviews_count: number | null;
  detected_need: string;
  score: number;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["new", "contacted", "replied", "won", "dead", "skip"];

const STATUS_STYLES: Record<string, string> = {
  new: "text-emerald-400 bg-emerald-950",
  contacted: "text-amber-400 bg-amber-950",
  replied: "text-sky-400 bg-sky-950",
  won: "text-emerald-300 bg-emerald-900",
  dead: "text-zinc-500 bg-zinc-900",
  skip: "text-zinc-500 bg-zinc-900",
};

function scoreStyle(score: number) {
  if (score >= 70) return "text-emerald-400 border-emerald-900 bg-emerald-950";
  if (score >= 45) return "text-amber-400 border-amber-900 bg-amber-950";
  return "text-zinc-500 border-zinc-800 bg-zinc-900";
}

interface Props {
  refreshKey: number;
}

export default function LeadTable({ refreshKey }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    country: "",
    status: "",
    minScore: "",
    lineType: "mobile", // default: hide landlines, since this is a WhatsApp pipeline
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.country) params.set("country", filters.country);
    if (filters.status) params.set("status", filters.status);
    if (filters.minScore) params.set("minScore", filters.minScore);
    if (filters.lineType !== "all") params.set("lineType", filters.lineType);

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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/40">
        <FilterSelect
          value={filters.lineType}
          onChange={(v) => setFilters({ ...filters, lineType: v })}
          options={[
            { value: "mobile", label: "Mobile numbers only" },
            { value: "all", label: "All numbers" },
            { value: "landline", label: "Landlines only" },
          ]}
        />
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
          options={[
            { value: "", label: "All statuses" },
            ...STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          value={filters.country}
          onChange={(v) => setFilters({ ...filters, country: v })}
          options={[
            { value: "", label: "All countries" },
            ...countries.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          value={filters.minScore}
          onChange={(v) => setFilters({ ...filters, minScore: v })}
          options={[
            { value: "", label: "Any score" },
            { value: "70", label: "Score 70+" },
            { value: "45", label: "Score 45+" },
          ]}
        />
        <span className="ml-auto text-xs text-zinc-500 tabular-nums">
          {loading ? "Loading…" : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
              <th className="px-4 py-2.5 font-medium w-16">Score</th>
              <th className="px-4 py-2.5 font-medium">Business</th>
              <th className="px-4 py-2.5 font-medium">Location</th>
              <th className="px-4 py-2.5 font-medium">Signal</th>
              <th className="px-4 py-2.5 font-medium">Pitch angle</th>
              <th className="px-4 py-2.5 font-medium">Contact</th>
              <th className="px-4 py-2.5 font-medium w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-zinc-900/50 transition-colors align-top">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center min-w-[2.25rem] rounded-md border px-1.5 py-0.5 text-xs font-mono font-medium tabular-nums ${scoreStyle(
                      lead.score
                    )}`}
                  >
                    {lead.score}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[190px]">
                  <div className="font-medium text-zinc-100 truncate">{lead.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{lead.category}</div>
                  {lead.rating && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                      <Star size={11} className="fill-current text-zinc-600" />
                      {lead.rating}
                      <span className="text-zinc-700">·</span>
                      {lead.reviews_count || 0} reviews
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                  <div className="text-zinc-400">{lead.city}</div>
                  <div>{lead.country}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5 text-xs">
                    <span className="flex items-center gap-1.5">
                      {lead.website_status === "none" ? (
                        <>
                          <GlobeLock size={12} className="text-rose-400 shrink-0" />
                          <span className="text-rose-400">no website</span>
                        </>
                      ) : lead.website_status === "ok" ? (
                        <>
                          <Globe size={12} className="text-zinc-500 shrink-0" />
                          <span className="text-zinc-500">has website</span>
                        </>
                      ) : (
                        <>
                          <Globe size={12} className="text-amber-400 shrink-0" />
                          <span className="text-amber-400">{lead.website_status} site</span>
                        </>
                      )}
                    </span>
                    {lead.running_ads && (
                      <span className="inline-flex w-fit items-center rounded bg-emerald-950 px-1.5 py-0.5 text-emerald-400">
                        running ads
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 max-w-[240px] text-xs text-zinc-400 leading-relaxed">
                  {lead.detected_need}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {lead.line_type === "landline" ? (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <PhoneOff size={12} />
                      landline — no WhatsApp
                    </span>
                  ) : lead.whatsapp_link ? (
                    <a
                      href={lead.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-mono"
                    >
                      <MessageCircle size={12} />
                      {lead.phone_e164}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-600">no number</span>
                  )}
                  {lead.line_type === "mobile" && (
                    <span className="flex items-center gap-1 text-[10px] text-zinc-600 mt-1">
                      <Smartphone size={10} /> mobile
                    </span>
                  )}
                  {lead.website && (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 hover:underline mt-1"
                    >
                      <ExternalLink size={10} /> site
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className={`w-full rounded-md px-2 py-1.5 text-xs border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-600 ${
                      STATUS_STYLES[lead.status] || ""
                    }`}
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
          <div className="text-center py-16 text-sm text-zinc-500">
            No leads match these filters yet.
            <br />
            <span className="text-xs text-zinc-600">
              Add target queries below and run a batch to populate this list.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-600 hover:border-zinc-700 transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
