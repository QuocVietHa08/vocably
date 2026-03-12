"use client";

import { motion } from "framer-motion";
import { type Flashcard } from "@/data/flashcards";

interface ResultsScreenProps {
  known: number;
  learning: number;
  total: number;
  onRestart: () => void;
  onRetryMissed: (cards: Flashcard[]) => void;
  allCards: Flashcard[];
}

export function ResultsScreen({ known, learning, total, onRestart, onRetryMissed, allCards }: ResultsScreenProps) {
  const pct      = Math.round((known / (total || 1)) * 100);
  const missed   = allCards.slice(known);
  const headline = pct >= 80 ? "Well done." : pct >= 50 ? "Good start." : "Keep going.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 40 }}>

      {/* Score */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "var(--accent)" }}>{pct}%</span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "var(--fg)" }}>{headline}</h2>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", borderRadius: 16, overflow: "hidden", background: "var(--surface)" }}>
        {[
          { label: "Got it",         value: known,    accent: true  },
          { label: "Still learning", value: learning, accent: false },
          { label: "Total",          value: total,    accent: false },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 4, borderLeft: i > 0 ? "1px solid var(--border)" : "none" }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: s.accent ? "var(--accent)" : "var(--fg)" }}>{s.value}</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, borderRadius: 2, background: "var(--subtle)", overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", background: "var(--accent)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        />
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {learning > 0 && (
          <button
            onClick={() => onRetryMissed(missed)}
            style={{ height: 48, borderRadius: 12, background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Retry {learning} card{learning !== 1 ? "s" : ""}
          </button>
        )}
        <button
          onClick={onRestart}
          style={{ height: 48, borderRadius: 12, background: "var(--surface)", color: "var(--fg)", border: "1px solid var(--border)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
        >
          Start over
        </button>
      </div>
    </div>
  );
}
