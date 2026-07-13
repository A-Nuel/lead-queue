"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Play, Loader2, CheckSquare, Square } from "lucide-react";

interface Target {
  id: string;
  country: string;
  city: string;
  category: string;
  active: boolean;
  last_run_at: string | null;
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
        }),
      });
      const data = await res.json();

      if (data.error) {
        setRunResult(`Error: ${data.error}`);
      } else {
        setRunResult(
          `Done — ${data.queriesRun} searches run, ${data.newLeads} new leads found (${data.rawResults} raw results).` +
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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <h2 className="text-sm font-medium mb-3 text-[var(--text)]">Target queries</h2>

      <form onSubmit={addTarget} className="flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Country (e.g. United Kingdom)"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="flex-1 min-w-[140px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          placeholder="City (e.g. Manchester)"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="flex-1 min-w-[140px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          placeholder="Category (e.g. hair salon)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="flex-1 min-w-[140px] rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-md bg-[var(--accent-dim)] text-[var(--accent)] px-3 py-1.5 text-sm hover:brightness-125 transition"
        >
          <Plus size={14} /> Add
        </button>
      </form>

      {targets.length === 0 ? (
        <p className="text-sm text-[var(--text-dim)]">
          No target queries yet. Add country/city/category combos above, then select and run a batch.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition"
            >
              {selected.size === targets.length ? (
                <CheckSquare size={14} />
              ) : (
                <Square size={14} />
              )}
              {selected.size === targets.length ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs text-[var(--text-dim)]">
              {selected.size} selected · {selected.size} SerpAPI call{selected.size === 1 ? "" : "s"}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
            {targets.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--bg)] transition"
              >
                <button onClick={() => toggleSelect(t.id)} className="shrink-0">
                  {selected.has(t.id) ? (
                    <CheckSquare size={15} className="text-[var(--accent)]" />
                  ) : (
                    <Square size={15} className="text-[var(--text-dim)]" />
                  )}
                </button>
                <span className="flex-1 truncate">
                  {t.category} — {t.city}, {t.country}
                </span>
                {t.last_run_at && (
                  <span className="text-xs text-[var(--text-dim)] shrink-0">
                    last run {new Date(t.last_run_at).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => removeTarget(t.id)}
                  className="text-[var(--text-dim)] hover:text-[var(--danger)] transition shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={runBatch}
            disabled={selected.size === 0 || running}
            className="mt-3 flex items-center gap-2 rounded-md bg-[var(--accent)] text-[#0d1117] font-medium px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
          >
            {running ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Running batch…
              </>
            ) : (
              <>
                <Play size={14} /> Run batch ({selected.size})
              </>
            )}
          </button>

          {runResult && (
            <p className="mt-2 text-xs text-[var(--text-dim)]">{runResult}</p>
          )}
        </>
      )}
    </div>
  );
}
