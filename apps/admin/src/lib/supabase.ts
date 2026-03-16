import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Type definitions matching your Supabase schema ───────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  session_count?: number;
  total_tokens?: number;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  created_at: string;
  card_count?: number;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  word: string;
  phonetic: string | null;
  part_of_speech: string | null;
  definition: string;
  example: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  band: number | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  user_email?: string;
  started_at: string;
  ended_at: string | null;
  cards_studied: number;
  known_count: number;
  score: number;
  deck_id: string | null;
  deck_title?: string | null;
}

export interface TokenUsage {
  id: string;
  user_id: string;
  user_email?: string;
  session_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  total_flashcards: number;
  active_sessions: number;
  total_tokens: number;
  total_cost_usd: number;
}
