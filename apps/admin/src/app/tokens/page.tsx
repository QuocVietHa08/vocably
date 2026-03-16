"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TokenUsage } from "@/lib/supabase";

export default function TokensPage() {
  const [records, setRecords] = useState<TokenUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("token_usage")
      .select(
        "id, user_id, user_email, session_id, model, input_tokens, output_tokens, total_tokens, cost_usd, created_at"
      )
      .order("created_at", { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  }

  // Aggregate stats
  const totalTokens = records.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const totalCost = records.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const totalInput = records.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const totalOutput = records.reduce((s, r) => s + (r.output_tokens ?? 0), 0);

  function fmt(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filtered = records.filter(
    (r) =>
      (r.user_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.model ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Per-user summary
  const userSummary = Object.values(
    records.reduce<
      Record<string, { email: string; tokens: number; cost: number; calls: number }>
    >((acc, r) => {
      const key = r.user_id;
      if (!acc[key]) {
        acc[key] = { email: r.user_email ?? r.user_id, tokens: 0, cost: 0, calls: 0 };
      }
      acc[key].tokens += r.total_tokens ?? 0;
      acc[key].cost += r.cost_usd ?? 0;
      acc[key].calls += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.tokens - a.tokens);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Token Usage
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          OpenAI API consumption across all users and sessions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        {[
          { label: "Total Tokens", value: fmt(totalTokens), icon: "🔋", color: "#6366f1" },
          { label: "Input Tokens", value: fmt(totalInput), icon: "📥", color: "#22c55e" },
          { label: "Output Tokens", value: fmt(totalOutput), icon: "📤", color: "#f59e0b" },
          { label: "Est. Cost (USD)", value: `$${totalCost.toFixed(4)}`, icon: "💰", color: "#ef4444" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {stat.label}
              </span>
              <span
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: stat.color + "18" }}
              >
                {stat.icon}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Two-col: per-user summary + full log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Per-user summary */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              By User
            </h2>
          </div>
          {userSummary.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              No data yet
            </p>
          ) : (
            userSummary.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ background: "#6366f1" }}
                  >
                    {u.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {u.email}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {u.calls} calls
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {fmt(u.tokens)}
                  </p>
                  <p className="text-xs" style={{ color: "#ef4444" }}>
                    ${u.cost.toFixed(4)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Full log */}
        <div
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Full Log
            </h2>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>🔍</span>
              <input
                type="text"
                placeholder="Filter…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="outline-none text-xs bg-transparent w-32"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["User", "Model", "Input", "Output", "Total", "Cost", "Date"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)", background: "var(--content-bg)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 rounded animate-pulse" style={{ background: "var(--border)", width: j === 0 ? 100 : 50 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {search ? "No records match" : "No token usage yet — connect Supabase to see data"}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="transition-colors hover:bg-slate-50"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-4 py-2.5 text-xs truncate max-w-[120px]" style={{ color: "var(--text-secondary)" }}>
                        {r.user_email ?? r.user_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "#6366f118", color: "#6366f1" }}
                        >
                          {r.model}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {fmt(r.input_tokens)}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {fmt(r.output_tokens)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        {fmt(r.total_tokens)}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "#ef4444" }}>
                        ${r.cost_usd.toFixed(5)}
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
