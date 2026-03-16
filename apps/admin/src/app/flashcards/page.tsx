"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Flashcard, Deck } from "@/lib/supabase";

type Tab = "decks" | "cards" | "words";

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#22c55e",
  medium: "#f59e0b",
  hard: "#ef4444",
};

// ─── Add Card Modal ───────────────────────────────────────────────────────────
function AddCardModal({
  decks,
  onClose,
  onSaved,
}: {
  decks: Deck[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    deck_id: decks[0]?.id ?? "",
    word: "",
    phonetic: "",
    part_of_speech: "",
    definition: "",
    example: "",
    difficulty: "medium" as Flashcard["difficulty"],
    category: "vocabulary",
    band: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.word || !form.definition) return;
    setSaving(true);
    await supabase.from("flashcards").insert({
      ...form,
      band: form.band ? Number(form.band) : null,
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Add New Flashcard
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Deck */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Deck</label>
            <select
              value={form.deck_id}
              onChange={(e) => setForm({ ...form, deck_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              {decks.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.title}</option>)}
              {decks.length === 0 && <option value="">— No decks —</option>}
            </select>
          </div>

          {/* Word */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Word *</label>
            <input
              value={form.word}
              onChange={(e) => setForm({ ...form, word: e.target.value })}
              placeholder="e.g. Albeit"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Phonetic */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Phonetic</label>
            <input
              value={form.phonetic}
              onChange={(e) => setForm({ ...form, phonetic: e.target.value })}
              placeholder="/ɔːlˈbiːɪt/"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Part of speech */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Part of Speech</label>
            <input
              value={form.part_of_speech}
              onChange={(e) => setForm({ ...form, part_of_speech: e.target.value })}
              placeholder="conjunction"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Difficulty</label>
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as Flashcard["difficulty"] })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Definition */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Definition *</label>
            <textarea
              value={form.definition}
              onChange={(e) => setForm({ ...form, definition: e.target.value })}
              rows={2}
              placeholder="Even though; although"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Example */}
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Example Sentence</label>
            <textarea
              value={form.example}
              onChange={(e) => setForm({ ...form, example: e.target.value })}
              rows={2}
              placeholder="The experiment was successful, albeit a bit time-consuming."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* IELTS Band */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>IELTS Band (5–9)</label>
            <input
              type="number"
              min={5}
              max={9}
              value={form.band}
              onChange={(e) => setForm({ ...form, band: e.target.value })}
              placeholder="7"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--content-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="vocabulary">Vocabulary</option>
              <option value="grammar">Grammar</option>
              <option value="idiom">Idiom</option>
              <option value="collocation">Collocation</option>
              <option value="phrasal-verb">Phrasal Verb</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg"
            style={{ background: "var(--content-bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !form.word || !form.definition}
            className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
            style={{ background: "#6366f1" }}
          >
            {saving ? "Saving…" : "Save Card"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const [tab, setTab] = useState<Tab>("decks");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddCard, setShowAddCard] = useState(false);
  const [filterDeck, setFilterDeck] = useState("all");

  useEffect(() => {
    loadDecks();
    loadCards();
  }, []);

  async function loadDecks() {
    const { data } = await supabase
      .from("decks")
      .select("id, title, description, emoji, color, created_at, card_count")
      .order("created_at", { ascending: false });
    setDecks(data ?? []);
  }

  async function loadCards() {
    setLoading(true);
    const { data } = await supabase
      .from("flashcards")
      .select("id, deck_id, word, phonetic, part_of_speech, definition, example, difficulty, category, band, created_at")
      .order("created_at", { ascending: false });
    setCards(data ?? []);
    setLoading(false);
  }

  async function deleteCard(id: string) {
    await supabase.from("flashcards").delete().eq("id", id);
    loadCards();
  }

  const filteredCards = cards.filter((c) => {
    const matchSearch =
      c.word.toLowerCase().includes(search.toLowerCase()) ||
      c.definition.toLowerCase().includes(search.toLowerCase());
    const matchDeck = filterDeck === "all" || c.deck_id === filterDeck;
    return matchSearch && matchDeck;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Flashcards &amp; Words
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage decks, cards, and vocabulary
          </p>
        </div>
        {tab !== "decks" && (
          <button
            onClick={() => setShowAddCard(true)}
            className="px-4 py-2 text-sm rounded-lg text-white font-medium transition-opacity hover:opacity-80"
            style={{ background: "#6366f1" }}
          >
            + Add Card
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg mb-5 w-fit"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
      >
        {(["decks", "cards", "words"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium rounded-md capitalize transition-all"
            style={{
              background: tab === t ? "#6366f1" : "transparent",
              color: tab === t ? "white" : "var(--text-secondary)",
            }}
          >
            {t === "words" ? "New Words" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── Decks Tab ─── */}
      {tab === "decks" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.length === 0 && !loading && (
            <p className="col-span-3 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No decks yet — connect Supabase to see data
            </p>
          )}
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="rounded-xl p-5 flex flex-col gap-3"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{deck.emoji}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {deck.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {deck.card_count ?? 0} cards
                  </p>
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {deck.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Cards / Words Tab ─── */}
      {(tab === "cards" || tab === "words") && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg flex-1"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--text-muted)" }}>🔍</span>
              <input
                type="text"
                placeholder="Search words…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 outline-none text-sm bg-transparent"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <select
              value={filterDeck}
              onChange={(e) => setFilterDeck(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--card-bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="all">All Decks</option>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.emoji} {d.title}</option>)}
            </select>
          </div>

          {/* Table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Word", "Definition", "Difficulty", "Category", "Band", "Actions"].map((h) => (
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
                          <div className="h-4 rounded animate-pulse" style={{ background: "var(--border)", width: j === 0 ? 100 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredCards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                      {search ? "No cards match your search" : "No flashcards yet — add one or connect Supabase"}
                    </td>
                  </tr>
                ) : (
                  filteredCards.map((card) => (
                    <tr
                      key={card.id}
                      className="transition-colors hover:bg-slate-50"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{card.word}</p>
                        {card.phonetic && (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{card.phonetic}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {card.definition}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{
                            background: (DIFFICULTY_COLOR[card.difficulty] ?? "#94a3b8") + "18",
                            color: DIFFICULTY_COLOR[card.difficulty] ?? "#94a3b8",
                          }}
                        >
                          {card.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs capitalize" style={{ color: "var(--text-secondary)" }}>
                        {card.category}
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {card.band ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => deleteCard(card.id)}
                          className="text-xs px-3 py-1 rounded-lg hover:opacity-80"
                          style={{ background: "#ef444418", color: "#ef4444" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showAddCard && (
        <AddCardModal
          decks={decks}
          onClose={() => setShowAddCard(false)}
          onSaved={loadCards}
        />
      )}
    </div>
  );
}
