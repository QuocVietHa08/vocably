-- ============================================================
-- Recommendation System Schema
-- Adds tables for swipe tracking, user level detection,
-- topic interest analysis, and spaced repetition scheduling.
-- ============================================================

-- ============================================================
-- 1. SWIPE_EVENTS — Raw log of every card swipe
-- ============================================================
create table if not exists public.swipe_events (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  flashcard_id  uuid not null references public.flashcards(id) on delete cascade,
  direction     text not null check (direction in ('right','left')),  -- right=know, left=don't know
  session_id    uuid references public.practice_sessions(id) on delete set null,
  response_time_ms int,  -- how long user spent before swiping (engagement signal)
  created_at    timestamptz not null default now()
);

create index if not exists idx_swipe_events_user      on public.swipe_events(user_id);
create index if not exists idx_swipe_events_card      on public.swipe_events(flashcard_id);
create index if not exists idx_swipe_events_created   on public.swipe_events(user_id, created_at desc);

-- ============================================================
-- 2. USER_LEVELS — Tracked CEFR level over time
-- ============================================================
create table if not exists public.user_levels (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  cefr_level    text not null check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  ielts_band    numeric(2,1) not null check (ielts_band between 3.0 and 9.0),
  confidence    numeric(3,2) not null default 0.50 check (confidence between 0 and 1),
  -- Breakdown scores (0.0 - 1.0) for granularity
  vocabulary_score   numeric(4,3) not null default 0.000,
  grammar_score      numeric(4,3) not null default 0.000,
  idiom_score        numeric(4,3) not null default 0.000,
  collocation_score  numeric(4,3) not null default 0.000,
  total_swipes       int not null default 0,
  known_count        int not null default 0,
  assessed_at        timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

create index if not exists idx_user_levels_user     on public.user_levels(user_id);
create index if not exists idx_user_levels_latest   on public.user_levels(user_id, assessed_at desc);

-- Convenience: latest level per user
create or replace view public.user_current_level as
select distinct on (user_id)
  id, user_id, cefr_level, ielts_band, confidence,
  vocabulary_score, grammar_score, idiom_score, collocation_score,
  total_swipes, known_count, assessed_at
from public.user_levels
order by user_id, assessed_at desc;

-- ============================================================
-- 3. TOPIC_INTERESTS — Aggregated topic engagement scores
-- ============================================================
create table if not exists public.topic_interests (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      text not null check (category in ('vocabulary','grammar','idiom','collocation','phrasal-verb')),
  -- Engagement metrics
  total_seen    int not null default 0,
  total_known   int not null default 0,
  total_time_ms bigint not null default 0,  -- cumulative response time
  -- Derived interest score (0.0 - 1.0, higher = more engaged)
  interest_score numeric(4,3) not null default 0.500,
  updated_at    timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists idx_topic_interests_user on public.topic_interests(user_id);

-- ============================================================
-- 4. SPACED_REPETITION — Per-card scheduling (SM-2 algorithm)
-- ============================================================
create table if not exists public.spaced_repetition (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  flashcard_id    uuid not null references public.flashcards(id) on delete cascade,
  -- SM-2 parameters
  easiness_factor numeric(4,2) not null default 2.50 check (easiness_factor >= 1.3),
  interval_days   int not null default 0,
  repetition      int not null default 0,
  quality         int not null default 0 check (quality between 0 and 5),
  -- Scheduling
  next_review_at  timestamptz not null default now(),
  last_reviewed_at timestamptz,
  total_reviews   int not null default 0,
  streak          int not null default 0,  -- consecutive correct
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, flashcard_id)
);

create index if not exists idx_sr_user_next    on public.spaced_repetition(user_id, next_review_at);
create index if not exists idx_sr_user_card    on public.spaced_repetition(user_id, flashcard_id);

-- ============================================================
-- 5. RECOMMENDATIONS — AI-generated word suggestions log
-- ============================================================
create table if not exists public.recommendations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  flashcard_id    uuid references public.flashcards(id) on delete set null,
  -- AI recommendation metadata
  reason          text not null,          -- why this was recommended
  source          text not null check (source in ('level_match','topic_interest','spaced_repetition','ai_generated')),
  relevance_score numeric(4,3) not null default 0.500,
  -- Tracking
  was_shown       boolean not null default false,
  was_swiped      boolean not null default false,
  swipe_direction text check (swipe_direction in ('right','left')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_recommendations_user on public.recommendations(user_id, created_at desc);

-- ============================================================
-- 6. CARD_QUEUE — Pre-computed recommendation queue (fast reads)
--    Cards are pre-loaded so the client never waits for AI.
--    The background worker keeps this queue filled.
-- ============================================================
create table if not exists public.card_queue (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  flashcard_id    uuid not null references public.flashcards(id) on delete cascade,
  -- Pre-computed card data (denormalized for speed — one query, no joins)
  word            text not null,
  phonetic        text,
  part_of_speech  text,
  definition      text not null,
  example         text not null,
  examples        text[],
  difficulty      text not null,
  category        text not null,
  band            int,
  synonyms        text[],
  tip             text,
  -- Recommendation metadata
  reason          text not null,
  source          text not null check (source in ('level_match','topic_interest','spaced_repetition','ai_generated')),
  relevance_score numeric(4,3) not null default 0.500,
  -- Queue ordering
  position        int not null default 0,
  -- Lifecycle
  status          text not null default 'ready' check (status in ('ready','served','swiped','expired')),
  served_at       timestamptz,
  created_at      timestamptz not null default now()
);

-- Critical: the GET endpoint filters by user + status + position
create index if not exists idx_card_queue_user_ready on public.card_queue(user_id, status, position)
  where status = 'ready';
create index if not exists idx_card_queue_user       on public.card_queue(user_id);

-- ============================================================
-- 7. WORD_EMBEDDINGS — For semantic similarity matching
-- ============================================================
create table if not exists public.word_embeddings (
  id            uuid primary key default uuid_generate_v4(),
  flashcard_id  uuid not null references public.flashcards(id) on delete cascade unique,
  embedding     vector(1536),  -- OpenAI text-embedding-3-small dimension
  topics        text[],        -- semantic topic tags from AI
  interest_tags text[],        -- e.g. ['business','academic','travel','daily-life']
  created_at    timestamptz not null default now()
);

create index if not exists idx_word_embeddings_card on public.word_embeddings(flashcard_id);

-- ============================================================
-- 7. Add target_level to profiles
-- ============================================================
alter table public.profiles
  add column if not exists target_ielts_band numeric(2,1) default 7.0,
  add column if not exists detected_cefr_level text default 'B1',
  add column if not exists onboarding_completed boolean not null default false;

-- ============================================================
-- 8. ROW LEVEL SECURITY for new tables
-- ============================================================
alter table public.swipe_events        enable row level security;
alter table public.user_levels         enable row level security;
alter table public.topic_interests     enable row level security;
alter table public.spaced_repetition   enable row level security;
alter table public.recommendations     enable row level security;
alter table public.card_queue          enable row level security;
alter table public.word_embeddings     enable row level security;

-- Swipe events
create policy "Users can manage own swipe events"
  on public.swipe_events for all using (auth.uid() = user_id);

create policy "Admins can view all swipe events"
  on public.swipe_events for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- User levels
create policy "Users can view own levels"
  on public.user_levels for select using (auth.uid() = user_id);

create policy "Service can insert levels"
  on public.user_levels for insert with check (true);

create policy "Admins can view all levels"
  on public.user_levels for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Topic interests
create policy "Users can view own topic interests"
  on public.topic_interests for select using (auth.uid() = user_id);

create policy "Service can manage topic interests"
  on public.topic_interests for all with check (true);

-- Spaced repetition
create policy "Users can manage own spaced repetition"
  on public.spaced_repetition for all using (auth.uid() = user_id);

-- Recommendations
create policy "Users can view own recommendations"
  on public.recommendations for select using (auth.uid() = user_id);

create policy "Service can manage recommendations"
  on public.recommendations for all with check (true);

-- Card queue
create policy "Users can read own card queue"
  on public.card_queue for select using (auth.uid() = user_id);

create policy "Service can manage card queue"
  on public.card_queue for all with check (true);

-- Word embeddings (public read)
create policy "Anyone can read word embeddings"
  on public.word_embeddings for select using (true);

create policy "Service can manage word embeddings"
  on public.word_embeddings for all with check (true);
