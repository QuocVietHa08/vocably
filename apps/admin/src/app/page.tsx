"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DashboardStats } from "@/lib/supabase";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <span
          className="text-xl w-9 h-9 flex items-center justify-center rounded-lg"
          style={{ background: color + "18" }}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityRow({
  email,
  action,
  time,
}: {
  email: string;
  action: string;
  time: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
          style={{ background: "#6366f1" }}
        >
          {email[0].toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {email}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {action}
          </p>
        </div>
      </div>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {time}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<
    { user_email: string; deck_title: string | null; started_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, flashcardsRes, sessionsRes, tokensRes] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("flashcards").select("id", { count: "exact", head: true }),
          supabase.from("sessions").select("id", { count: "exact", head: true }),
          supabase.from("token_usage").select("total_tokens, cost_usd").limit(1000),
        ]);

        const totalTokens = (tokensRes.data ?? []).reduce(
          (s, r) => s + (r.total_tokens ?? 0),
          0
        );
        const totalCost = (tokensRes.data ?? []).reduce(
          (s, r) => s + (r.cost_usd ?? 0),
          0
        );

        setStats({
          total_users: usersRes.count ?? 0,
          total_flashcards: flashcardsRes.count ?? 0,
          active_sessions: sessionsRes.count ?? 0,
          total_tokens: totalTokens,
          total_cost_usd: totalCost,
        });

        const { data: recent } = await supabase
          .from("sessions")
          .select("user_email, deck_title, started_at")
          .order("started_at", { ascending: false })
          .limit(5);

        setRecentSessions(recent ?? []);
      } catch {
        setStats({
          total_users: 0,
          total_flashcards: 0,
          active_sessions: 0,
          total_tokens: 0,
          total_cost_usd: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatTokens(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Overview of your IELTS Coach platform
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl p-5 h-28 animate-pulse"
              style={{ background: "var(--border)" }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          <StatCard
            label="Total Users"
            icon="👥"
            value={stats?.total_users ?? 0}
            sub="Registered accounts"
            color="#6366f1"
          />
          <StatCard
            label="Flashcards"
            icon="🗂️"
            value={stats?.total_flashcards ?? 0}
            sub="Across all decks"
            color="#22c55e"
          />
          <StatCard
            label="Sessions"
            icon="⏱️"
            value={stats?.active_sessions ?? 0}
            sub="Practice sessions"
            color="#f59e0b"
          />
          <StatCard
            label="Tokens Used"
            icon="🔋"
            value={formatTokens(stats?.total_tokens ?? 0)}
            sub={`$${(stats?.total_cost_usd ?? 0).toFixed(2)} estimated cost`}
            color="#ef4444"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Sessions */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h2
            className="text-base font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Recent Sessions
          </h2>
          {recentSessions.length === 0 ? (
            <p
              className="text-sm py-8 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              No sessions yet — connect Supabase to see live data
            </p>
          ) : (
            recentSessions.map((s, i) => (
              <ActivityRow
                key={i}
                email={s.user_email ?? "unknown"}
                action={`Studied: ${s.deck_title ?? "Unknown deck"}`}
                time={timeAgo(s.started_at)}
              />
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
        >
          <h2
            className="text-base font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Flashcard", href: "/flashcards", icon: "➕", color: "#6366f1" },
              { label: "View Users", href: "/users", icon: "👥", color: "#22c55e" },
              { label: "View Sessions", href: "/sessions", icon: "⏱️", color: "#f59e0b" },
              { label: "Token Report", href: "/tokens", icon: "🔋", color: "#ef4444" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg text-center transition-all duration-150 hover:opacity-80"
                style={{
                  background: item.color + "12",
                  border: `1px solid ${item.color}30`,
                  textDecoration: "none",
                }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
