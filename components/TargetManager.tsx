"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Play, Loader2, CheckSquare, Square, ChevronDown, ChevronUp } from "lucide-react";

interface Target {
  id: string;
  country: string;
  city: string;
  category: string;
  active: boolean;
  last_run_at: string | null;
  leads_count: number;
}

interface Props {
  onBatchComplete: () => void;
}

export default function TargetManager({ onBatchComplete }: Props) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ country: "", city: "", category: "" });
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [pagesPerQuery, setPagesPerQuery] = useState(1);

  function loadTargets() {
    fetch("/api/targets")
      .then((r) => r.json())
      .then((d) => setTargets(d.targets || []));
  }

  useEffect(loadTargets, []);

  async function addTarget(e: React.FormEvent) {
    e.preventDefault();
    if (!form.country || !form.city || !form.category) return;
    await fetch("/api/targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ country: "", city: "", category: "" });
    loadTargets();
  }

  async function removeTarget(id: string) {
    await fetch(`/api/targets?id=${id}`, { method: "DELETE" });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    loadTargets();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === targets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(targets.map((t) => t.id)));
    }
  }

  async function runBatch() {
    const chosen = targets.filter((t) => selected.has(t.id));
    if (chosen.length === 0) return;

    setRunning(true);
    setRunResult(null);

    try {
      const res = await fetch("/api/search/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: `Batch ${new Date().toLocaleDateString()} — ${chosen.length} queries`,
          queries: chosen.map((t) => ({
            country: t.country,
            city: t.city,
            category: t.category,
          })),
          pagesPerQuery,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setRunResult(`Error: ${data.error}`);
      } else {
        setRunResult(
          `Done — ${data.quotaUnitsUsed} SerpAPI call(s) used, ${data.newLeads} new leads found (${data.rawResults} raw results).` +
            (data.errors?.length ? ` ${data.errors.length} query error(s).` : "")
        );
        onBatchComplete();
        loadTargets();
      }
    } catch (err) {
      setRunResult(err instanceof Error ? err.message : "Batch run failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-zinc-200">Target queries</h2>
          <span className="text-xs text-zinc-600">
            {targets.length} saved · {selected.size} selected
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-zinc-500" />
        ) : (
          <ChevronDown size={16} className="text-zinc-500" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
          <form onSubmit={addTarget} className="flex flex-wrap gap-2 mb-4">
            <input
              placeholder="Country (e.g. United Kingdom)"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="flex-1 min-w-[150px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700 transition-colors"
            />
            <input
              placeholder="City (e.g. Manchester)"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="flex-1 min-w-[150px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700 transition-colors"
            />
            <input
              placeholder="Category (e.g. hair salon)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="flex-1 min-w-[150px] rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:border-emerald-700 transition-colors"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-zinc-800 text-zinc-200 px-3.5 py-2 text-sm hover:bg-zinc-700 transition-colors"
            >
              <Plus size={14} /> Add
            </button>
          </form>

          {targets.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No target queries yet. Add country/city/category combos above, then select and run a batch.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {selected.size === targets.length ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                  {selected.size === targets.length ? "Deselect all" : "Select all"}
                </button>
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span>Results depth:</span>
                  <select
                    value={pagesPerQuery}
                    onChange={(e) => setPagesPerQuery(parseInt(e.target.value, 10))}
                    className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value={1}>~20/query (1 page)</option>
                    <option value={2}>~40/query (2 pages)</option>
                    <option value={3}>~60/query (3 pages)</option>
                    <option value={5}>~100/query (5 pages)</option>
                  </select>
                  <span>
                    = {selected.size * pagesPerQuery} SerpAPI call{selected.size * pagesPerQuery === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-800 divide-y divide-zinc-900">
                {targets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-900/50 transition-colors"
                  >
                    <button onClick={() => toggleSelect(t.id)} className="shrink-0">
                      {selected.has(t.id) ? (
                        <CheckSquare size={15} className="text-emerald-400" />
                      ) : (
                        <Square size={15} className="text-zinc-600" />
                      )}
                    </button>
                    <span className="flex-1 truncate text-zinc-300">
                      <span className="text-zinc-100">{t.category}</span>
                      <span className="text-zinc-600"> — {t.city}, {t.country}</span>
                    </span>
                    <span
                      className={`text-[11px] shrink-0 ${
                        t.leads_count > 0 ? "text-zinc-500" : "text-zinc-700"
                      }`}
                      title={
                        t.leads_count > 0 && pagesPerQuery === 1
                          ? "Re-running at depth 1 will likely return mostly duplicates — try increasing Results depth to reach new results further down the ranking."
                          : undefined
                      }
                    >
                      {t.leads_count > 0 ? `${t.leads_count} leads stored` : "not run yet"}
                      {t.leads_count > 0 && pagesPerQuery === 1 && " ⚠"}
                    </span>
                    {t.last_run_at && (
                      <span className="text-[11px] text-zinc-600 shrink-0">
                        last run {new Date(t.last_run_at).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      onClick={() => removeTarget(t.id)}
                      className="text-zinc-600 hover:text-rose-400 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={runBatch}
                disabled={selected.size === 0 || running}
                className="mt-3 flex items-center gap-2 rounded-md bg-emerald-500 text-zinc-950 font-medium px-4 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
              >
                {running ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Running batch…
                  </>
                ) : (
                  <>
                    <Play size={14} /> Run batch ({selected.size * pagesPerQuery} call{selected.size * pagesPerQuery === 1 ? "" : "s"})
                  </>
                )}
              </button>

              {runResult && <p className="mt-2 text-xs text-zinc-500">{runResult}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
