-- ============================================================
-- VOCALLY — Complete Database Initialization
-- Run this once in Supabase SQL Editor to get a fully working DB.
--
-- Includes:
--   1. Schema (tables, indexes, RLS, triggers)
--   2. Recommendation system tables
--   3. A test user profile (no real auth.users insert needed — see note)
--   4. Flashcard seed data (~100 IELTS words)
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 1 — BASE SCHEMA
-- ============================================================

-- ── 1a. PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   text NOT NULL,
  full_name               text,
  avatar_url              text,
  is_admin                boolean NOT NULL DEFAULT false,
  current_streak          int NOT NULL DEFAULT 0,
  longest_streak          int NOT NULL DEFAULT 0,
  last_practice_date      date,
  total_practice_sessions int NOT NULL DEFAULT 0,
  target_ielts_band       numeric(2,1) DEFAULT 7.0,
  detected_cefr_level     text DEFAULT 'B1',
  onboarding_completed    boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on new user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 1b. DECKS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.decks (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       text NOT NULL,
  description text,
  emoji       text NOT NULL DEFAULT '📚',
  color       text NOT NULL DEFAULT 'from-blue-500 to-indigo-600',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 1c. FLASHCARDS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flashcards (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id        uuid REFERENCES public.decks(id) ON DELETE CASCADE,
  word           text NOT NULL,
  phonetic       text,
  part_of_speech text,
  definition     text NOT NULL,
  example        text NOT NULL,
  examples       text[],
  difficulty     text NOT NULL CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
  category       text NOT NULL CHECK (category IN ('vocabulary','grammar','idiom','collocation','phrasal-verb')) DEFAULT 'vocabulary',
  band           int  CHECK (band BETWEEN 5 AND 9),
  synonyms       text[],
  tip            text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 1d. PRACTICE SESSIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_id       uuid REFERENCES public.decks(id) ON DELETE SET NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  cards_studied int NOT NULL DEFAULT 0,
  known_count   int NOT NULL DEFAULT 0,
  unknown_count int NOT NULL DEFAULT 0,
  score         int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Streak update helper
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date date;
  v_today     date := current_date;
  v_streak    int;
  v_longest   int;
BEGIN
  SELECT last_practice_date, current_streak, longest_streak
    INTO v_last_date, v_streak, v_longest
    FROM public.profiles WHERE id = p_user_id;

  IF v_last_date = v_today THEN
    RETURN;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  v_longest := greatest(v_longest, v_streak);

  UPDATE public.profiles
     SET current_streak          = v_streak,
         longest_streak          = v_longest,
         last_practice_date      = v_today,
         total_practice_sessions = total_practice_sessions + 1,
         updated_at              = now()
   WHERE id = p_user_id;
END;
$$;

-- ── 1e. CONVERSATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic         text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  duration_secs int,
  message_count int NOT NULL DEFAULT 0,
  word_count    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 1f. CAPTURED WORDS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.captured_words (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  word            text NOT NULL,
  definition      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);

-- ── 1g. TOKEN USAGE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.token_usage (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  model           text NOT NULL,
  input_tokens    int NOT NULL DEFAULT 0,
  output_tokens   int NOT NULL DEFAULT 0,
  total_tokens    int NOT NULL DEFAULT 0,
  cost_usd        numeric(10,6) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 2 — RECOMMENDATION SYSTEM TABLES
-- ============================================================

-- ── 2a. SWIPE_EVENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.swipe_events (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id     uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  direction        text NOT NULL CHECK (direction IN ('right','left')),
  session_id       uuid REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
  response_time_ms int,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_swipe_events_user    ON public.swipe_events(user_id);
CREATE INDEX IF NOT EXISTS idx_swipe_events_card    ON public.swipe_events(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_swipe_events_created ON public.swipe_events(user_id, created_at DESC);

-- ── 2b. USER_LEVELS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_levels (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cefr_level        text NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  ielts_band        numeric(2,1) NOT NULL CHECK (ielts_band BETWEEN 3.0 AND 9.0),
  confidence        numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence BETWEEN 0 AND 1),
  vocabulary_score  numeric(4,3) NOT NULL DEFAULT 0.000,
  grammar_score     numeric(4,3) NOT NULL DEFAULT 0.000,
  idiom_score       numeric(4,3) NOT NULL DEFAULT 0.000,
  collocation_score numeric(4,3) NOT NULL DEFAULT 0.000,
  total_swipes      int NOT NULL DEFAULT 0,
  known_count       int NOT NULL DEFAULT 0,
  assessed_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_levels_user   ON public.user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_latest ON public.user_levels(user_id, assessed_at DESC);

CREATE OR REPLACE VIEW public.user_current_level AS
SELECT DISTINCT ON (user_id)
  id, user_id, cefr_level, ielts_band, confidence,
  vocabulary_score, grammar_score, idiom_score, collocation_score,
  total_swipes, known_count, assessed_at
FROM public.user_levels
ORDER BY user_id, assessed_at DESC;

-- ── 2c. TOPIC_INTERESTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.topic_interests (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category       text NOT NULL CHECK (category IN ('vocabulary','grammar','idiom','collocation','phrasal-verb')),
  total_seen     int NOT NULL DEFAULT 0,
  total_known    int NOT NULL DEFAULT 0,
  total_time_ms  bigint NOT NULL DEFAULT 0,
  interest_score numeric(4,3) NOT NULL DEFAULT 0.500,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_topic_interests_user ON public.topic_interests(user_id);

-- ── 2d. SPACED_REPETITION ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spaced_repetition (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id     uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  easiness_factor  numeric(4,2) NOT NULL DEFAULT 2.50 CHECK (easiness_factor >= 1.3),
  interval_days    int NOT NULL DEFAULT 0,
  repetition       int NOT NULL DEFAULT 0,
  quality          int NOT NULL DEFAULT 0 CHECK (quality BETWEEN 0 AND 5),
  next_review_at   timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  total_reviews    int NOT NULL DEFAULT 0,
  streak           int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, flashcard_id)
);

CREATE INDEX IF NOT EXISTS idx_sr_user_next ON public.spaced_repetition(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_sr_user_card ON public.spaced_repetition(user_id, flashcard_id);

-- ── 2e. RECOMMENDATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recommendations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id    uuid REFERENCES public.flashcards(id) ON DELETE SET NULL,
  reason          text NOT NULL,
  source          text NOT NULL CHECK (source IN ('level_match','topic_interest','spaced_repetition','ai_generated')),
  relevance_score numeric(4,3) NOT NULL DEFAULT 0.500,
  was_shown       boolean NOT NULL DEFAULT false,
  was_swiped      boolean NOT NULL DEFAULT false,
  swipe_direction text CHECK (swipe_direction IN ('right','left')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations(user_id, created_at DESC);

-- ── 2f. CARD_QUEUE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.card_queue (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flashcard_id    uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  word            text NOT NULL,
  phonetic        text,
  part_of_speech  text,
  definition      text NOT NULL,
  example         text NOT NULL,
  examples        text[],
  difficulty      text NOT NULL,
  category        text NOT NULL,
  band            int,
  synonyms        text[],
  tip             text,
  reason          text NOT NULL,
  source          text NOT NULL CHECK (source IN ('level_match','topic_interest','spaced_repetition','ai_generated')),
  relevance_score numeric(4,3) NOT NULL DEFAULT 0.500,
  position        int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','served','swiped','expired')),
  served_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_queue_user_ready ON public.card_queue(user_id, status, position)
  WHERE status = 'ready';
CREATE INDEX IF NOT EXISTS idx_card_queue_user ON public.card_queue(user_id);

-- ── 2g. WORD_EMBEDDINGS ──────────────────────────────────────
-- NOTE: requires pgvector extension — enable in Supabase Dashboard → Extensions first
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE TABLE IF NOT EXISTS public.word_embeddings (
--   id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
--   flashcard_id uuid NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE UNIQUE,
--   embedding    vector(1536),
--   topics       text[],
--   interest_tags text[],
--   created_at   timestamptz NOT NULL DEFAULT now()
-- );

-- ── Misc indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_deck ON public.practice_sessions(deck_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user     ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv     ON public.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_captured_words_user    ON public.captured_words(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_user       ON public.token_usage(user_id);

-- ============================================================
-- SECTION 3 — ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_words        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_interests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_queue            ENABLE ROW LEVEL SECURITY;

-- Profiles
DO $$ BEGIN
  CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Decks & Flashcards — public read
DO $$ BEGIN
  CREATE POLICY "Anyone can read decks"       ON public.decks       FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can read flashcards"  ON public.flashcards  FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admins can manage decks"     ON public.decks       FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admins can manage flashcards" ON public.flashcards FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Practice sessions
DO $$ BEGIN
  CREATE POLICY "Users can manage own practice sessions" ON public.practice_sessions FOR ALL USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Conversations
DO $$ BEGIN
  CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can manage messages in own conversations"
    ON public.conversation_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Captured words & token usage
DO $$ BEGIN
  CREATE POLICY "Users can manage own captured words" ON public.captured_words FOR ALL USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can view own token usage" ON public.token_usage FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own token usage" ON public.token_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Swipe events
DO $$ BEGIN
  CREATE POLICY "Users can manage own swipe events" ON public.swipe_events FOR ALL USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User levels
DO $$ BEGIN
  CREATE POLICY "Users can view own levels" ON public.user_levels FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service can insert levels" ON public.user_levels FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Topic interests
DO $$ BEGIN
  CREATE POLICY "Users can view own topic interests" ON public.topic_interests FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service can manage topic interests" ON public.topic_interests FOR ALL WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Spaced repetition
DO $$ BEGIN
  CREATE POLICY "Users can manage own spaced repetition" ON public.spaced_repetition FOR ALL USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service can manage spaced repetition" ON public.spaced_repetition FOR ALL WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Recommendations
DO $$ BEGIN
  CREATE POLICY "Users can view own recommendations" ON public.recommendations FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service can manage recommendations" ON public.recommendations FOR ALL WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Card queue
DO $$ BEGIN
  CREATE POLICY "Users can read own card queue" ON public.card_queue FOR SELECT USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service can manage card queue" ON public.card_queue FOR ALL WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SECTION 4 — TEST USER SETUP
-- ============================================================
-- The FastAPI backend uses a device-generated ID (e.g. "device-abc123")
-- stored in AsyncStorage as the user_id for all API calls.
-- The profiles table FK references auth.users(id).
--
-- For testing WITHOUT Supabase Auth, we need to:
--   a) Create a real auth.users row, OR
--   b) Relax the FK constraint so any UUID can be inserted.
--
-- APPROACH USED HERE: create a real Supabase auth user via the API
-- (recommended). The SQL below inserts directly into auth schema
-- only for local/testing. In production, use Supabase Auth signup.
--
-- ⚠️  This approach works in Supabase SQL Editor because the service
--     role bypasses RLS. It will NOT work from the client.
--
-- Test credentials:
--   Email:    test@vocally.app
--   Password: Password123!
--   User ID:  d290f1ee-6c54-4b01-90e6-d701748f0851

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'test@vocally.app',
  crypt('Password123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- The trigger should have auto-created the profile, but add a safety net:
INSERT INTO public.profiles (id, email, full_name, is_admin, onboarding_completed)
VALUES (
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'test@vocally.app',
  'Test User',
  true,
  true
) ON CONFLICT (id) DO UPDATE
  SET is_admin = true, onboarding_completed = true;

-- Seed the test user's initial level (B1 / Band 5.5 — typical IELTS starter)
INSERT INTO public.user_levels (
  user_id, cefr_level, ielts_band, confidence,
  vocabulary_score, grammar_score, idiom_score, collocation_score
) VALUES (
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'B1', 5.5, 0.50,
  0.400, 0.400, 0.300, 0.300
) ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 5 — FLASHCARD SEED DATA
-- ============================================================

DO $$
DECLARE
  v_deck_id uuid;
BEGIN
  -- Insert the seed deck (idempotent)
  INSERT INTO public.decks (title, description, emoji, color, is_active)
  VALUES ('IELTS Essential 100', '100 high-frequency academic words to boost your IELTS score.', '🚀', 'from-blue-500 to-indigo-600', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_deck_id;

  -- If deck already existed, look it up
  IF v_deck_id IS NULL THEN
    SELECT id INTO v_deck_id FROM public.decks WHERE title = 'IELTS Essential 100' LIMIT 1;
  END IF;

  -- Insert flashcards (skip duplicates)
  INSERT INTO public.flashcards (deck_id, word, phonetic, part_of_speech, definition, example, difficulty, category, band) VALUES
  (v_deck_id, 'abate',          '/əˈbeɪt/',           'verb',      'become less intense or widespread',                   'The storm suddenly abated.',                              'hard',   'vocabulary', 7),
  (v_deck_id, 'aberration',     '/ˌæbəˈreɪʃn/',        'noun',      'a departure from what is normal or expected',          'They described the outbreak of violence as an aberration.','hard',   'vocabulary', 8),
  (v_deck_id, 'abhor',          '/əbˈhɔːr/',           'verb',      'regard with disgust and hatred',                      'Professional tax preparers abhor a flat tax.',            'hard',   'vocabulary', 8),
  (v_deck_id, 'accolade',       '/ˈækəleɪd/',          'noun',      'an award or privilege granted as a special honor',    'The ultimate official accolade of a visit.',              'medium', 'vocabulary', 7),
  (v_deck_id, 'acumen',         '/ˈækjuːmən/',         'noun',      'the ability to make good judgments',                  'Business acumen.',                                        'hard',   'vocabulary', 8),
  (v_deck_id, 'alacrity',       '/əˈlækrəti/',         'noun',      'brisk and cheerful readiness',                        'She accepted the invitation with alacrity.',              'hard',   'vocabulary', 8),
  (v_deck_id, 'alleviate',      '/əˈliːvieɪt/',        'verb',      'make less severe',                                    'He could not prevent her pain, only alleviate it.',       'medium', 'vocabulary', 6),
  (v_deck_id, 'ambiguous',      '/æmˈbɪɡjuəs/',        'adjective', 'open to more than one interpretation',                'The election result was ambiguous.',                      'medium', 'vocabulary', 6),
  (v_deck_id, 'ameliorate',     '/əˈmiːliəreɪt/',      'verb',      'make something bad or unsatisfactory better',         'The reform did much to ameliorate living standards.',     'hard',   'vocabulary', 8),
  (v_deck_id, 'amiable',        '/ˈeɪmiəbl/',          'adjective', 'having or displaying a friendly and pleasant manner', 'An amiable, unassuming fellow.',                          'medium', 'vocabulary', 6),
  (v_deck_id, 'animosity',      '/ˌænɪˈmɑːsəti/',      'noun',      'strong hostility',                                    'He no longer felt any animosity toward her.',             'medium', 'vocabulary', 7),
  (v_deck_id, 'apathy',         '/ˈæpəθi/',            'noun',      'lack of interest, enthusiasm, or concern',            'Widespread apathy among students.',                       'medium', 'vocabulary', 7),
  (v_deck_id, 'apprehensive',   '/ˌæprɪˈhensɪv/',      'adjective', 'anxious or fearful that something bad will happen',   'He felt apprehensive about going home.',                  'medium', 'vocabulary', 6),
  (v_deck_id, 'arduous',        '/ˈɑːrdʒuəs/',         'adjective', 'involving or requiring strenuous effort',             'An arduous journey.',                                     'hard',   'vocabulary', 7),
  (v_deck_id, 'articulate',     '/ɑːrˈtɪkjuleɪt/',     'adjective', 'speaking fluently and coherently',                   'An articulate account of their experiences.',              'medium', 'vocabulary', 6),
  (v_deck_id, 'astute',         '/əˈstuːt/',           'adjective', 'having an ability to accurately assess situations',   'An astute businessman.',                                  'hard',   'vocabulary', 7),
  (v_deck_id, 'audacious',      '/ɔːˈdeɪʃəs/',         'adjective', 'showing a willingness to take surprisingly bold risks','A series of audacious takeovers.',                      'hard',   'vocabulary', 8),
  (v_deck_id, 'austere',        '/ɔːˈstɪr/',           'adjective', 'severe or strict in manner',                          'An austere man.',                                         'hard',   'vocabulary', 8),
  (v_deck_id, 'banal',          '/bəˈnɑːl/',           'adjective', 'lacking in originality',                              'Songs with banal, repeated words.',                       'hard',   'vocabulary', 8),
  (v_deck_id, 'belligerent',    '/bəˈlɪdʒərənt/',      'adjective', 'hostile and aggressive',                              'A belligerent old man.',                                  'hard',   'vocabulary', 8),
  (v_deck_id, 'benevolent',     '/bəˈnevələnt/',        'adjective', 'well meaning and kindly',                             'A benevolent smile.',                                     'medium', 'vocabulary', 6),
  (v_deck_id, 'bolster',        '/ˈboʊlstər/',         'verb',      'support or strengthen',                               'Bolster confidence.',                                     'medium', 'vocabulary', 7),
  (v_deck_id, 'candid',         '/ˈkændɪd/',           'adjective', 'truthful and straightforward',                        'His responses were remarkably candid.',                   'medium', 'vocabulary', 6),
  (v_deck_id, 'catalyst',       '/ˈkætəlɪst/',         'noun',      'a person or thing that precipitates an event',        'The speech acted as a catalyst.',                         'medium', 'vocabulary', 7),
  (v_deck_id, 'cogent',         '/ˈkoʊdʒənt/',         'adjective', 'clear, logical, and convincing',                      'Cogent arguments.',                                       'hard',   'vocabulary', 8),
  (v_deck_id, 'collaborate',    '/kəˈlæbəreɪt/',       'verb',      'work jointly on an activity',                         'He collaborated on the designs.',                         'medium', 'vocabulary', 6),
  (v_deck_id, 'commensurate',   '/kəˈmensərət/',        'adjective', 'corresponding in size or degree',                    'Salary will be commensurate with experience.',            'hard',   'vocabulary', 8),
  (v_deck_id, 'compelling',     '/kəmˈpelɪŋ/',         'adjective', 'evoking interest in a powerfully irresistible way',  'Compelling eyes.',                                        'medium', 'vocabulary', 7),
  (v_deck_id, 'complacent',     '/kəmˈpleɪsnt/',        'adjective', 'showing smug satisfaction',                          'Complacent about security.',                              'hard',   'vocabulary', 8),
  (v_deck_id, 'concise',        '/kənˈsaɪs/',          'adjective', 'giving information clearly and in a few words',       'A concise account.',                                      'medium', 'vocabulary', 6),
  (v_deck_id, 'conundrum',      '/kəˈnʌndrəm/',        'noun',      'a confusing and difficult problem',                   'A difficult conundrum.',                                  'hard',   'vocabulary', 8),
  (v_deck_id, 'copious',        '/ˈkoʊpiəs/',          'adjective', 'abundant in supply or quantity',                      'She took copious notes.',                                 'medium', 'vocabulary', 7),
  (v_deck_id, 'corroborate',    '/kəˈrɑːbəreɪt/',      'verb',      'confirm or give support to',                          'Corroborated the account.',                               'hard',   'vocabulary', 8),
  (v_deck_id, 'culpable',       '/ˈkʌlpəbl/',          'adjective', 'deserving blame',                                     'Just as culpable.',                                       'hard',   'vocabulary', 8),
  (v_deck_id, 'daunting',       '/ˈdɔːntɪŋ/',          'adjective', 'seeming difficult to deal with',                      'A daunting task.',                                        'medium', 'vocabulary', 7),
  (v_deck_id, 'dearth',         '/dɜːrθ/',             'noun',      'a scarcity',                                          'A dearth of evidence.',                                   'hard',   'vocabulary', 8),
  (v_deck_id, 'debilitate',     '/dɪˈbɪlɪteɪt/',       'verb',      'make someone weak',                                   'A bout of the flu had debilitated her.',                  'hard',   'vocabulary', 8),
  (v_deck_id, 'deleterious',    '/ˌdeləˈtɪriəs/',       'adjective', 'causing harm or damage',                              'Deleterious effects.',                                    'hard',   'vocabulary', 8),
  (v_deck_id, 'derogatory',     '/dɪˈrɑːɡətɔːri/',     'adjective', 'showing critical attitude',                           'Derogatory remarks.',                                     'medium', 'vocabulary', 7),
  (v_deck_id, 'despondent',     '/dɪˈspɑːndənt/',      'adjective', 'in low spirits from loss of hope',                   'She grew more despondent.',                               'hard',   'vocabulary', 8),
  (v_deck_id, 'deterrent',      '/dɪˈtɜːrənt/',        'noun',      'a thing that discourages action',                     'A deterrent to crime.',                                   'medium', 'vocabulary', 7),
  (v_deck_id, 'detrimental',    '/ˌdetrɪˈmentl/',       'adjective', 'tending to cause harm',                               'Detrimental to national security.',                       'medium', 'vocabulary', 7),
  (v_deck_id, 'diligent',       '/ˈdɪlɪdʒənt/',        'adjective', 'having or showing care in ones work',                 'A diligent search.',                                      'medium', 'vocabulary', 6),
  (v_deck_id, 'discerning',     '/dɪˈsɜːrnɪŋ/',        'adjective', 'showing good judgment',                               'Discerning customers.',                                   'hard',   'vocabulary', 7),
  (v_deck_id, 'discrepancy',    '/dɪsˈkrepənsi/',       'noun',      'a lack of compatibility or similarity',               'A discrepancy between accounts.',                         'medium', 'vocabulary', 7),
  (v_deck_id, 'disparage',      '/dɪˈspærɪdʒ/',        'verb',      'represent as being of little worth',                  'Disparage competitors.',                                  'hard',   'vocabulary', 8),
  (v_deck_id, 'disparity',      '/dɪˈspærəti/',        'noun',      'a great difference',                                  'Economic disparities.',                                   'hard',   'vocabulary', 8),
  (v_deck_id, 'disseminate',    '/dɪˈsemɪneɪt/',       'verb',      'spread widely',                                       'Disseminating information.',                              'hard',   'vocabulary', 8),
  (v_deck_id, 'divergent',      '/daɪˈvɜːrdʒənt/',     'adjective', 'tending to be different',                             'Divergent interpretations.',                              'medium', 'vocabulary', 7),
  (v_deck_id, 'dogmatic',       '/dɔːɡˈmætɪk/',        'adjective', 'inclined to lay down principles as incontrovertibly true','A dogmatic opinion.',                               'hard',   'vocabulary', 8),
  (v_deck_id, 'dormant',        '/ˈdɔːrmənt/',         'adjective', 'having normal functions suspended',                   'Dormant butterflies.',                                    'medium', 'vocabulary', 7),
  (v_deck_id, 'dubious',        '/ˈduːbiəs/',          'adjective', 'hesitating or doubting',                              'Looked dubious.',                                         'medium', 'vocabulary', 7),
  (v_deck_id, 'ebullient',      '/ɪˈbʊliənt/',         'adjective', 'cheerful and full of energy',                         'Sounded ebullient and happy.',                            'hard',   'vocabulary', 8),
  (v_deck_id, 'eclectic',       '/ɪˈklektɪk/',         'adjective', 'deriving ideas from a broad range of sources',        'Eclectic tastes.',                                        'hard',   'vocabulary', 8),
  (v_deck_id, 'elicit',         '/ɪˈlɪsɪt/',           'verb',      'evoke or draw out a response',                        'Elicit exclamations of approval.',                        'hard',   'vocabulary', 7),
  (v_deck_id, 'eloquent',       '/ˈeləkwənt/',         'adjective', 'fluent or persuasive in speaking or writing',         'An eloquent speech.',                                     'medium', 'vocabulary', 7),
  (v_deck_id, 'elucidate',      '/ɪˈluːsɪdeɪt/',       'verb',      'make clear or explain',                               'To elucidate this matter.',                               'hard',   'vocabulary', 8),
  (v_deck_id, 'emanate',        '/ˈeməneɪt/',          'verb',      'originate from or be produced by',                    'Warmth emanated from the fire.',                          'medium', 'vocabulary', 7),
  (v_deck_id, 'emulate',        '/ˈemjuleɪt/',         'verb',      'match or surpass, typically by imitation',            'Hers is a name to emulate.',                              'medium', 'vocabulary', 7),
  (v_deck_id, 'endemic',        '/enˈdemɪk/',          'adjective', 'regularly found and restricted to a particular place', 'Malaria is endemic in many regions.',                    'hard',   'vocabulary', 8),
  (v_deck_id, 'enigmatic',      '/ˌenɪɡˈmætɪk/',       'adjective', 'difficult to interpret or understand; mysterious',    'He was an enigmatic figure.',                             'hard',   'vocabulary', 8),
  (v_deck_id, 'ephemeral',      '/ɪˈfemərəl/',         'adjective', 'lasting for a very short time',                       'Fame is ephemeral.',                                      'hard',   'vocabulary', 8),
  (v_deck_id, 'equivocal',      '/ɪˈkwɪvəkəl/',        'adjective', 'open to more than one interpretation',                'An equivocal answer.',                                    'hard',   'vocabulary', 8),
  (v_deck_id, 'erroneous',      '/ɪˈroʊniəs/',         'adjective', 'wrong; incorrect',                                    'An erroneous conclusion.',                                'medium', 'vocabulary', 7),
  (v_deck_id, 'erudite',        '/ˈerʊdaɪt/',          'adjective', 'having or showing great knowledge',                   'An erudite scholar.',                                     'hard',   'vocabulary', 8),
  (v_deck_id, 'esoteric',       '/ˌesəˈterɪk/',        'adjective', 'intended for or understood by a small number',        'Esoteric philosophical debates.',                         'hard',   'vocabulary', 8),
  (v_deck_id, 'exacerbate',     '/ɪɡˈzæsərbeɪt/',      'verb',      'make worse',                                          'The drought exacerbated the famine.',                     'hard',   'vocabulary', 8),
  (v_deck_id, 'exemplary',      '/ɪɡˈzempləri/',       'adjective', 'serving as a desirable model',                        'Exemplary conduct.',                                      'medium', 'vocabulary', 7),
  (v_deck_id, 'exhaustive',     '/ɪɡˈzɔːstɪv/',        'adjective', 'thorough and comprehensive',                          'An exhaustive study.',                                    'medium', 'vocabulary', 7),
  (v_deck_id, 'exorbitant',     '/ɪɡˈzɔːrbɪtənt/',     'adjective', 'unreasonably large or expensive',                    'Exorbitant prices.',                                      'medium', 'vocabulary', 7),
  (v_deck_id, 'expedite',       '/ˈekspɪdaɪt/',        'verb',      'make an action or process happen sooner',             'Measures to expedite the talks.',                         'medium', 'vocabulary', 7),
  (v_deck_id, 'exploit',        '/ɪkˈsplɔɪt/',         'verb',      'make use of something unfairly',                      'Exploit natural resources.',                              'medium', 'vocabulary', 6),
  (v_deck_id, 'facilitate',     '/fəˈsɪlɪteɪt/',       'verb',      'make easy or easier',                                 'Facilitate the process.',                                 'medium', 'vocabulary', 6),
  (v_deck_id, 'fallacious',     '/fəˈleɪʃəs/',         'adjective', 'based on a mistaken belief',                          'Fallacious reasoning.',                                   'hard',   'vocabulary', 8),
  (v_deck_id, 'fastidious',     '/fæˈstɪdiəs/',        'adjective', 'very attentive to detail; very careful',              'A fastidious worker.',                                    'hard',   'vocabulary', 8),
  (v_deck_id, 'fervent',        '/ˈfɜːrvənt/',         'adjective', 'having or displaying a passionate intensity',         'A fervent supporter.',                                    'medium', 'vocabulary', 7),
  (v_deck_id, 'flagrant',       '/ˈfleɪɡrənt/',        'adjective', 'conspicuously or obviously offensive',                'A flagrant violation.',                                   'hard',   'vocabulary', 8),
  (v_deck_id, 'fortuitous',     '/fɔːrˈtuːɪtəs/',      'adjective', 'happening by chance rather than design',              'A fortuitous meeting.',                                   'hard',   'vocabulary', 8),
  (v_deck_id, 'frugal',         '/ˈfruːɡəl/',          'adjective', 'sparing or economical with money',                    'A frugal lifestyle.',                                     'medium', 'vocabulary', 7),
  (v_deck_id, 'fundamental',    '/ˌfʌndəˈmentl/',      'adjective', 'forming a necessary base; of central importance',     'A fundamental change.',                                   'easy',   'vocabulary', 5),
  (v_deck_id, 'futile',         '/ˈfjuːtaɪl/',         'adjective', 'incapable of producing any useful result',            'A futile attempt.',                                       'medium', 'vocabulary', 7),
  (v_deck_id, 'gratuitous',     '/ɡrəˈtuːɪtəs/',       'adjective', 'uncalled for; lacking good reason',                   'Gratuitous violence.',                                    'hard',   'vocabulary', 8),
  (v_deck_id, 'gregarious',     '/ɡrɪˈɡeriəs/',        'adjective', 'fond of company; sociable',                           'A gregarious personality.',                               'hard',   'vocabulary', 8),
  (v_deck_id, 'hamper',         '/ˈhæmpər/',           'verb',      'hinder or impede the movement or progress of',        'Their work was hampered by bureaucracy.',                 'medium', 'vocabulary', 6),
  (v_deck_id, 'hypocritical',   '/ˌhɪpəˈkrɪtɪkl/',     'adjective', 'behaving in a way that contradicts claimed beliefs', 'Hypocritical behavior.',                                  'medium', 'vocabulary', 7),
  (v_deck_id, 'imminent',       '/ˈɪmɪnənt/',          'adjective', 'about to happen',                                     'Imminent danger.',                                        'medium', 'vocabulary', 6),
  (v_deck_id, 'impartial',      '/ɪmˈpɑːrʃl/',         'adjective', 'treating all rivals or disputants equally',           'An impartial observer.',                                  'medium', 'vocabulary', 6),
  (v_deck_id, 'impede',         '/ɪmˈpiːd/',           'verb',      'delay or prevent by obstructing',                     'This would impede traffic flow.',                         'medium', 'vocabulary', 7),
  (v_deck_id, 'implicit',       '/ɪmˈplɪsɪt/',         'adjective', 'implied though not plainly expressed',                'Implicit trust.',                                         'medium', 'vocabulary', 7),
  (v_deck_id, 'incisive',       '/ɪnˈsaɪsɪv/',         'adjective', 'intelligently analytical and clear-thinking',         'Incisive comments.',                                      'hard',   'vocabulary', 8),
  (v_deck_id, 'incoherent',     '/ˌɪnkoʊˈhɪrənt/',     'adjective', 'expressed in an unclear or confusing way',            'Incoherent rambling.',                                    'medium', 'vocabulary', 7),
  (v_deck_id, 'indifferent',    '/ɪnˈdɪfrənt/',        'adjective', 'having no particular interest or concern',            'He was indifferent to her problems.',                     'medium', 'vocabulary', 6),
  (v_deck_id, 'indiscriminate', '/ˌɪndɪˈskrɪmɪnət/',   'adjective', 'done without judgment or careful selection',          'Indiscriminate bombing.',                                 'hard',   'vocabulary', 8),
  (v_deck_id, 'inevitable',     '/ɪnˈevɪtəbl/',        'adjective', 'certain to happen; unavoidable',                      'An inevitable conclusion.',                               'medium', 'vocabulary', 6),
  (v_deck_id, 'inherent',       '/ɪnˈhɪrənt/',         'adjective', 'existing as a natural or basic part of something',    'Inherent risks.',                                         'medium', 'vocabulary', 7),
  (v_deck_id, 'innovative',     '/ˈɪnəveɪtɪv/',        'adjective', 'featuring new methods; advanced and original',        'An innovative approach.',                                 'easy',   'vocabulary', 5),
  (v_deck_id, 'integrity',      '/ɪnˈteɡrəti/',        'noun',      'the quality of being honest and having morals',       'A person of integrity.',                                  'medium', 'vocabulary', 6),
  (v_deck_id, 'intrinsic',      '/ɪnˈtrɪnzɪk/',        'adjective', 'belonging naturally; essential',                      'The intrinsic value of work.',                            'hard',   'vocabulary', 8),
  (v_deck_id, 'lucid',          '/ˈluːsɪd/',           'adjective', 'expressed clearly; easy to understand',               'A lucid explanation.',                                    'medium', 'vocabulary', 7),
  (v_deck_id, 'meticulous',     '/məˈtɪkjuːləs/',      'adjective', 'showing great attention to detail',                   'Meticulous planning.',                                    'medium', 'vocabulary', 7),
  (v_deck_id, 'mitigate',       '/ˈmɪtɪɡeɪt/',         'verb',      'make less severe, serious, or painful',               'Drain the marshes to mitigate flooding.',                 'hard',   'vocabulary', 8),
  (v_deck_id, 'mundane',        '/mʌnˈdeɪn/',          'adjective', 'lacking interest or excitement; dull',                'Mundane routine tasks.',                                  'medium', 'vocabulary', 7),
  (v_deck_id, 'nonchalant',     '/ˈnɑːnʃələnt/',       'adjective', 'feeling or appearing casually calm',                  'A nonchalant shrug.',                                     'hard',   'vocabulary', 8),
  (v_deck_id, 'nuance',         '/ˈnjuːɑːns/',         'noun',      'a subtle difference in or shade of meaning',          'The nuances of language.',                                'medium', 'vocabulary', 7),
  (v_deck_id, 'objective',      '/əbˈdʒektɪv/',        'adjective', 'not influenced by personal feelings; unbiased',       'An objective assessment.',                                'easy',   'vocabulary', 5),
  (v_deck_id, 'obscure',        '/əbˈskjʊr/',          'adjective', 'not discovered or known about; uncertain',            'An obscure reference.',                                   'medium', 'vocabulary', 7),
  (v_deck_id, 'obsolete',       '/ˈɑːbsəliːt/',        'adjective', 'no longer produced or used; out of date',             'Obsolete technology.',                                    'medium', 'vocabulary', 7),
  (v_deck_id, 'ominous',        '/ˈɑːmɪnəs/',          'adjective', 'suggesting that something bad is going to happen',    'Ominous storm clouds.',                                   'medium', 'vocabulary', 7),
  (v_deck_id, 'paradox',        '/ˈpærədɑːks/',        'noun',      'a seemingly absurd self-contradictory statement',     'A paradox of modern life.',                               'medium', 'vocabulary', 7),
  (v_deck_id, 'pervasive',      '/pərˈveɪsɪv/',        'adjective', 'spreading widely throughout an area',                 'A pervasive smell of anxiety.',                           'hard',   'vocabulary', 8),
  (v_deck_id, 'pragmatic',      '/præɡˈmætɪk/',        'adjective', 'dealing with things sensibly and realistically',      'A pragmatic approach to politics.',                       'medium', 'vocabulary', 7),
  (v_deck_id, 'profound',       '/prəˈfaʊnd/',         'adjective', 'very great or intense',                               'A profound effect.',                                      'medium', 'vocabulary', 6),
  (v_deck_id, 'proliferate',    '/prəˈlɪfəreɪt/',      'verb',      'increase rapidly in number',                          'Mobile devices have proliferated.',                       'hard',   'vocabulary', 8),
  (v_deck_id, 'prudent',        '/ˈpruːdənt/',         'adjective', 'acting with or showing care for the future',          'A prudent decision.',                                     'medium', 'vocabulary', 7),
  (v_deck_id, 'resilient',      '/rɪˈzɪliənt/',        'adjective', 'able to recover quickly from difficult conditions',   'A resilient material.',                                   'medium', 'vocabulary', 6),
  (v_deck_id, 'rhetoric',       '/ˈretərɪk/',          'noun',      'language designed to have a persuasive effect',       'Political rhetoric.',                                     'medium', 'vocabulary', 7),
  (v_deck_id, 'scrutinize',     '/ˈskruːtɪnaɪz/',      'verb',      'examine or inspect closely and thoroughly',           'She scrutinized the document.',                           'hard',   'vocabulary', 7),
  (v_deck_id, 'spontaneous',    '/spɑːnˈteɪniəs/',     'adjective', 'performed as a natural impulse without planning',     'Spontaneous applause.',                                   'medium', 'vocabulary', 6),
  (v_deck_id, 'stoic',          '/ˈstoʊɪk/',           'adjective', 'enduring pain without showing feelings',              'A stoic acceptance.',                                     'hard',   'vocabulary', 8),
  (v_deck_id, 'substantiate',   '/səbˈstænʃieɪt/',     'verb',      'provide evidence to support or prove the truth of',   'He could not substantiate his claim.',                    'hard',   'vocabulary', 8),
  (v_deck_id, 'subtle',         '/ˈsʌtl/',             'adjective', 'so delicate or precise as to be difficult to analyse','A subtle change in temperature.',                         'medium', 'vocabulary', 6),
  (v_deck_id, 'superficial',    '/ˌsuːpərˈfɪʃl/',       'adjective', 'existing only at the surface',                       'A superficial wound.',                                    'medium', 'vocabulary', 6),
  (v_deck_id, 'tenacious',      '/tɪˈneɪʃəs/',         'adjective', 'not readily relinquishing a position',               'A tenacious grip.',                                       'hard',   'vocabulary', 8),
  (v_deck_id, 'ubiquitous',     '/juːˈbɪkwɪtəs/',      'adjective', 'present, appearing, or found everywhere',             'His ubiquitous influence.',                               'hard',   'vocabulary', 8),
  (v_deck_id, 'unprecedented',  '/ʌnˈpresɪdentɪd/',    'adjective', 'never done or known before',                          'Unprecedented success.',                                  'medium', 'vocabulary', 7),
  (v_deck_id, 'verbose',        '/vɜːrˈboʊs/',         'adjective', 'using more words than needed',                        'A verbose explanation.',                                  'hard',   'vocabulary', 8),
  (v_deck_id, 'viable',         '/ˈvaɪəbl/',           'adjective', 'capable of working successfully',                     'A viable plan.',                                          'medium', 'vocabulary', 6),
  (v_deck_id, 'vigilant',       '/ˈvɪdʒɪlənt/',        'adjective', 'keeping careful watch',                               'Please remain vigilant.',                                 'medium', 'vocabulary', 7)
  ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- DONE!
-- ============================================================
-- Test user credentials:
--   Email:    test@vocally.app
--   Password: Password123!
--   UUID:     d290f1ee-6c54-4b01-90e6-d701748f0851
--
-- This UUID can be hardcoded in the mobile .env for bypass testing:
--   EXPO_PUBLIC_TEST_USER_ID=d290f1ee-6c54-4b01-90e6-d701748f0851
-- ============================================================
