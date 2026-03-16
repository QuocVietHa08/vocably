"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Conversation {
  id: string;
  user_id: string;
  user_email?: string;
  topic: string | null;
  started_at: string;
  ended_at: string | null;
  duration_secs: number | null;
  message_count: number;
  word_count: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 mt-1"
        style={{ background: isUser ? "#6366f1" : "#22c55e" }}
      >
        {isUser ? "U" : "AI"}
      </div>
      <div
        className="max-w-[75%] px-3 py-2 rounded-xl text-sm"
        style={{
          background: isUser ? "#6366f118" : "#f8fafc",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ─── Conversation Detail Panel ────────────────────────────────────────────────
function ConversationPanel({
  conv,
  onClose,
}: {
  conv: Conversation;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("conversation_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      });
  }, [conv.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl flex flex-col shadow-2xl"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {conv.topic ?? "Untitled conversation"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {conv.user_email} · {formatDate(conv.started_at)} · {formatDuration(conv.duration_secs)}
            </p>
            <div className="flex gap-3 mt-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                💬 {conv.message_count} messages
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                📝 {conv.word_count} words
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg"
            style={{ background: "var(--content-bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Close
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading messages…</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm py-12" style={{ color: "var(--text-muted)" }}>
              No messages recorded for this conversation
            </p>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Conversation | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("conversations")
      .select("id, user_id, user_email, topic, started_at, ended_at, duration_secs, message_count, word_count")
      .order("started_at", { ascending: false })
      .then(({ data }) => {
        setConversations((data as Conversation[]) ?? []);
        setLoading(false);
      });
  }, []);

  const totalMessages = conversations.reduce((s, c) => s + c.message_count, 0);
  const totalWords    = conversations.reduce((s, c) => s + c.word_count, 0);
  const avgDuration   = conversations.length
    ? Math.round(conversations.reduce((s, c) => s + (c.duration_secs ?? 0), 0) / conversations.length)
    : 0;

  const filtered = conversations.filter((c) =>
    (c.user_email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.topic ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Conversations
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          All talk practice sessions and message history
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Sessions",   value: conversations.length, icon: "💬", color: "#6366f1" },
          { label: "Total Messages",   value: totalMessages.toLocaleString(), icon: "📨", color: "#22c55e" },
          { label: "Avg Duration",     value: formatDuration(avgDuration), icon: "⏱️", color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
            <span className="w-10 h-10 flex items-center justify-center rounded-lg text-xl"
              style={{ background: s.color + "18" }}>{s.icon}</span>
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
          placeholder="Search by user or topic…"
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
              {["User", "Topic", "Date", "Duration", "Messages", "Words", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)", background: "var(--content-bg)" }}>
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
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 rounded animate-pulse"
                        style={{ background: "var(--border)", width: j === 0 ? 140 : 70 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm"
                style={{ color: "var(--text-muted)" }}>
                {search ? "No conversations match" : "No conversations yet — connect Supabase to see data"}
              </td></tr>
            ) : (
              filtered.map((conv) => (
                <tr key={conv.id} className="transition-colors hover:bg-slate-50"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                        style={{ background: "#6366f1" }}>
                        {(conv.user_email ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                        {conv.user_email ?? "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {conv.topic ?? <span style={{ color: "var(--text-muted)" }}>No topic</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(conv.started_at)}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {formatDuration(conv.duration_secs)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs"
                      style={{ background: "#6366f118", color: "#6366f1" }}>
                      {conv.message_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {conv.word_count.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setSelected(conv)}
                      className="text-xs px-3 py-1 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: "#6366f118", color: "#6366f1" }}>
                      View →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ConversationPanel conv={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
