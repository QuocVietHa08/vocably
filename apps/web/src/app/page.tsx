"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { allCards, type Flashcard } from "@/data/flashcards";
import { FlashCard } from "@/components/flashcard/FlashCard";
import { ResultsScreen } from "@/components/flashcard/ResultsScreen";
import { supabase } from "@/lib/supabase";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const router = useRouter();
  const [cards, setCards]       = useState<Flashcard[]>(allCards);
  const [index, setIndex]       = useState(0);
  const [known, setKnown]       = useState(0);
  const [learning, setLearning] = useState(0);
  const [done, setDone]         = useState(false);

  // Track session start for Supabase
  const sessionStartRef = useRef<Date | null>(null);

  // Shuffle after mount — Math.random() can't run during SSR
  useEffect(() => {
    setCards(shuffle(allCards));
    sessionStartRef.current = new Date();
  }, []);

  const currentCard = cards[index];
  const total       = cards.length;

  const advance = useCallback((result: "know" | "dontknow") => {
    if (result === "know") setKnown((n) => n + 1);
    else setLearning((n) => n + 1);
    if (index + 1 >= total) setDone(true);
    else setIndex((i) => i + 1);
  }, [index, total]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === "ArrowRight") advance("know");
      if (e.key === "ArrowLeft")  advance("dontknow");
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [advance, done]);

  // ── Save practice session to Supabase when done ──────────────────────
  useEffect(() => {
    if (!done) return;

    async function savePracticeSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // not logged in — skip silently

      const endedAt  = new Date();
      const score    = total > 0 ? Math.round((known / total) * 100) : 0;

      // Insert session record
      await supabase.from("practice_sessions").insert({
        user_id:       user.id,
        started_at:    sessionStartRef.current?.toISOString() ?? endedAt.toISOString(),
        ended_at:      endedAt.toISOString(),
        cards_studied: total,
        known_count:   known,
        unknown_count: learning,
        score,
      });

      // Update streak via Supabase function
      await supabase.rpc("update_streak", { p_user_id: user.id });
    }

    savePracticeSession();
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const restart = () => {
    setCards(shuffle(allCards));
    setIndex(0); setKnown(0); setLearning(0); setDone(false);
    sessionStartRef.current = new Date();
  };

  const retryMissed = (missed: Flashcard[]) => {
    setCards(shuffle(missed));
    setIndex(0); setKnown(0); setLearning(0); setDone(false);
    sessionStartRef.current = new Date();
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", minHeight: "100dvh", maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 48, paddingBottom: 32 }}>

        {/* Speaking practice button */}
        <button
          onClick={() => router.push("/practice")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--muted)",
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--fg)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--fg)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
          }}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path strokeLinecap="round" d="M5 10a7 7 0 0014 0M12 19v3M8 22h8" />
          </svg>
          Speaking
        </button>

        {/* Card counter */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "inline-block", marginBottom: 2, marginRight: 2 }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
            {done ? total : index + 1}
          </span>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>/{total}</span>
        </div>
      </div>

      {/* Card / Results */}
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ResultsScreen known={known} learning={learning} total={total} onRestart={restart} onRetryMissed={retryMissed} allCards={cards} />
          </motion.div>
        ) : currentCard ? (
          <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18, ease: "easeOut" }}>
            <FlashCard card={currentCard} onKnow={() => advance("know")} onDontKnow={() => advance("dontknow")} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
