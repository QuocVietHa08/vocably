"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  total_practice_sessions: number;
  created_at: string;
}

function StreakBadge({ streak }: { streak: number }) {
  const color = streak >= 7 ? "#f59e0b" : streak >= 3 ? "#22c55e" : "#94a3b8";
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: color + "18", color }}>
      🔥 {streak}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers]     = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, is_admin, current_streak, longest_streak, last_practice_date, total_practice_sessions, created_at")
      .order("created_at", { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }

  async function deleteUser(id: string) {
    const supabase = createClient();
    await supabase.from("profiles").delete().eq("id", id);
    setDeleteId(null);
    load();
  }

  async function toggleAdmin(id: string, current: boolean) {
    setTogglingAdmin(id);
    const supabase = createClient();
    await supabase.from("profiles").update({ is_admin: !current }).eq("id", id);
    setTogglingAdmin(null);
    load();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalSessions = users.reduce((s, u) => s + u.total_practice_sessions, 0);
  const activeStreaks  = users.filter((u) => u.current_streak > 0).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Users</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {users.length} registered accounts
          </p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Users",       value: users.length,             icon: "👥", color: "#6366f1" },
          { label: "Practice Sessions", value: totalSessions,            icon: "⏱️", color: "#22c55e" },
          { label: "Active Streaks",    value: activeStreaks,            icon: "🔥", color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
            <span className="w-10 h-10 flex items-center justify-center rounded-lg text-xl"
              style={{ background: s.color + "18" }}>
              {s.icon}
            </span>
            <div>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-5"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
        <span style={{ color: "var(--text-muted)" }}>🔍</span>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm bg-transparent"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["User", "Email", "Joined", "Sessions", "Streak", "Best Streak", "Role", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)", background: "var(--content-bg)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 rounded animate-pulse"
                        style={{ background: "var(--border)", width: j === 0 ? 140 : 60 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}>
                  {search ? "No users match your search" : "No users yet — connect Supabase to see data"}
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-slate-50"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ background: "#6366f1" }}>
                        {user.email[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-xs" style={{ color: "var(--text-primary)" }}>
                        {user.full_name ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs"
                      style={{ background: "#6366f118", color: "#6366f1" }}>
                      {user.total_practice_sessions}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StreakBadge streak={user.current_streak} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      🏆 {user.longest_streak} days
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAdmin(user.id, user.is_admin)}
                      disabled={togglingAdmin === user.id}
                      className="text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{
                        background: user.is_admin ? "#6366f118" : "#94a3b818",
                        color: user.is_admin ? "#6366f1" : "#94a3b8",
                      }}>
                      {user.is_admin ? "Admin" : "User"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteId(user.id)}
                      className="text-xs px-3 py-1 rounded-lg hover:opacity-80"
                      style={{ background: "#ef444418", color: "#ef4444" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="rounded-xl p-6 w-80 shadow-xl"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Delete User?
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
              This permanently deletes the user and all their data including conversations, sessions, and token history.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm rounded-lg"
                style={{ background: "var(--content-bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                Cancel
              </button>
              <button onClick={() => deleteUser(deleteId)} className="px-4 py-2 text-sm rounded-lg text-white"
                style={{ background: "#ef4444" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
