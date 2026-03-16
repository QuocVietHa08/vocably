"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/supabase";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("sessions")
      .select(
        "id, user_id, user_email, started_at, ended_at, cards_studied, known_count, score, deck_id, deck_title"
      )
      .order("started_at", { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  }

  function duration(start: string, end: string | null) {
    if (!end) return "In progress";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
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

  function scoreColor(score: number) {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  }

  const filtered = sessions.filter(
    (s) =>
      (s.user_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.deck_title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Aggregate stats
  const avgScore =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / sessions.length)
      : 0;
  const totalCards = sessions.reduce((sum, s) => sum + (s.cards_studied ?? 0), 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Sessions
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {sessions.length} total practice sessions
          </p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Sessions", value: sessions.length, icon: "⏱️", color: "#6366f1" },
          { label: "Avg Score", value: `${avgScore}%`, icon: "🎯", color: "#22c55e" },
          { label: "Cards Studied", value: totalCards.toLocaleString(), icon: "🗂️", color: "#f59e0b" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
          >
            <span
              className="w-10 h-10 flex items-center justify-center rounded-lg text-xl"
              style={{ background: stat.color + "18" }}
            >
              {stat.icon}
            </span>
            <div>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {stat.value}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--text-muted)" }}>🔍</span>
        <input
          type="text"
          placeholder="Search by user or deck…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm bg-transparent"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["User", "Deck", "Started", "Duration", "Cards", "Score"].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
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
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 rounded animate-pulse" style={{ background: "var(--border)", width: j === 0 ? 160 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {search ? "No sessions match your search" : "No sessions yet — connect Supabase to see data"}
                </td>
              </tr>
            ) : (
              filtered.map((session) => (
                <tr
                  key={session.id}
                  className="transition-colors hover:bg-slate-50"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ background: "#6366f1" }}
                      >
                        {(session.user_email ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                        {session.user_email ?? "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {session.deck_title ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(session.started_at)}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {duration(session.started_at, session.ended_at)}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {session.cards_studied ?? 0}
                    {session.known_count != null && (
                      <span style={{ color: "#22c55e" }}> (+{session.known_count})</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: scoreColor(session.score ?? 0) + "18",
                        color: scoreColor(session.score ?? 0),
                      }}
                    >
                      {session.score ?? 0}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
