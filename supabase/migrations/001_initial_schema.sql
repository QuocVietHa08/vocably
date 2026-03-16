-- ============================================================
-- IELTS Coach — Full Database Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
--    Extends Supabase auth.users with app-specific fields
-- ============================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  avatar_url      text,
  is_admin        boolean not null default false,
  current_streak  int     not null default 0,
  longest_streak  int     not null default 0,
  last_practice_date date,
  total_practice_sessions int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile on new user sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. DECKS
-- ============================================================
create table if not exists public.decks (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  description text,
  emoji       text not null default '📚',
  color       text not null default 'from-blue-500 to-indigo-600',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 3. FLASHCARDS
-- ============================================================
create table if not exists public.flashcards (
  id             uuid primary key default uuid_generate_v4(),
  deck_id        uuid references public.decks(id) on delete cascade,
  word           text not null,
  phonetic       text,
  part_of_speech text,
  definition     text not null,
  example        text not null,
  examples       text[],           -- extra example sentences
  difficulty     text not null check (difficulty in ('easy','medium','hard')) default 'medium',
  category       text not null check (category in ('vocabulary','grammar','idiom','collocation','phrasal-verb')) default 'vocabulary',
  band           int  check (band between 5 and 9),
  synonyms       text[],
  tip            text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================
-- 4. PRACTICE SESSIONS  (flashcard study)
-- ============================================================
create table if not exists public.practice_sessions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  deck_id       uuid references public.decks(id) on delete set null,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  cards_studied int  not null default 0,
  known_count   int  not null default 0,
  unknown_count int  not null default 0,
  score         int  not null default 0,  -- percentage 0-100
  created_at    timestamptz not null default now()
);

-- Streak update function — called after each practice session
create or replace function public.update_streak(p_user_id uuid)
returns void language plpgsql security definer as $$
declare
  v_last_date   date;
  v_today       date := current_date;
  v_streak      int;
  v_longest     int;
begin
  select last_practice_date, current_streak, longest_streak
    into v_last_date, v_streak, v_longest
    from public.profiles
   where id = p_user_id;

  if v_last_date = v_today then
    -- Already practiced today, no change needed
    return;
  elsif v_last_date = v_today - interval '1 day' then
    -- Consecutive day — extend streak
    v_streak := v_streak + 1;
  else
    -- Streak broken — reset
    v_streak := 1;
  end if;

  v_longest := greatest(v_longest, v_streak);

  update public.profiles
     set current_streak          = v_streak,
         longest_streak          = v_longest,
         last_practice_date      = v_today,
         total_practice_sessions = total_practice_sessions + 1,
         updated_at              = now()
   where id = p_user_id;
end;
$$;

-- ============================================================
-- 5. CONVERSATIONS  (talk / speaking sessions)
-- ============================================================
create table if not exists public.conversations (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  topic         text,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_secs int,
  message_count int  not null default 0,
  word_count    int  not null default 0,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 6. CONVERSATION MESSAGES
-- ============================================================
create table if not exists public.conversation_messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 7. CAPTURED WORDS  (vocabulary saved during talk sessions)
-- ============================================================
create table if not exists public.captured_words (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  word            text not null,
  definition      text,
  created_at      timestamptz not null default now(),
  unique (user_id, word)   -- no duplicate words per user
);

-- ============================================================
-- 8. TOKEN USAGE
-- ============================================================
create table if not exists public.token_usage (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  model           text not null,
  input_tokens    int  not null default 0,
  output_tokens   int  not null default 0,
  total_tokens    int  not null default 0,
  cost_usd        numeric(10,6) not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 9. INDEXES  (for performance)
-- ============================================================
create index if not exists idx_practice_sessions_user    on public.practice_sessions(user_id);
create index if not exists idx_practice_sessions_deck    on public.practice_sessions(deck_id);
create index if not exists idx_conversations_user        on public.conversations(user_id);
create index if not exists idx_conv_messages_conv        on public.conversation_messages(conversation_id);
create index if not exists idx_captured_words_user       on public.captured_words(user_id);
create index if not exists idx_token_usage_user          on public.token_usage(user_id);
create index if not exists idx_token_usage_conv          on public.token_usage(conversation_id);

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles             enable row level security;
alter table public.decks                enable row level security;
alter table public.flashcards           enable row level security;
alter table public.practice_sessions    enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.captured_words       enable row level security;
alter table public.token_usage          enable row level security;

-- ── Profiles ──
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ── Decks & Flashcards — public read ──
create policy "Anyone can read decks"
  on public.decks for select using (true);

create policy "Admins can manage decks"
  on public.decks for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

create policy "Anyone can read flashcards"
  on public.flashcards for select using (true);

create policy "Admins can manage flashcards"
  on public.flashcards for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ── Practice sessions ──
create policy "Users can manage own practice sessions"
  on public.practice_sessions for all using (auth.uid() = user_id);

create policy "Admins can view all practice sessions"
  on public.practice_sessions for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ── Conversations ──
create policy "Users can manage own conversations"
  on public.conversations for all using (auth.uid() = user_id);

create policy "Admins can view all conversations"
  on public.conversations for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ── Conversation messages ──
create policy "Users can manage messages in own conversations"
  on public.conversation_messages for all
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = auth.uid()
  ));

create policy "Admins can view all messages"
  on public.conversation_messages for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ── Captured words ──
create policy "Users can manage own captured words"
  on public.captured_words for all using (auth.uid() = user_id);

create policy "Admins can view all captured words"
  on public.captured_words for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ── Token usage ──
create policy "Users can insert own token usage"
  on public.token_usage for insert with check (auth.uid() = user_id);

create policy "Users can view own token usage"
  on public.token_usage for select using (auth.uid() = user_id);

create policy "Admins can view all token usage"
  on public.token_usage for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============================================================
-- 11. SEED — Make first user an admin (run manually after sign-up)
-- ============================================================
-- UPDATE public.profiles SET is_admin = true WHERE email = 'your-admin@email.com';
