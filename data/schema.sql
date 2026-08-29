-- ============================================================
-- Chinese study app — core schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor (or via `supabase db push`
-- if you're using the CLI + migrations).
-- ============================================================

-- ---------- words ----------
create table if not exists public.words (
  id             bigint generated always as identity primary key,
  hanzi          text not null,
  traditional    text,
  pinyin         text not null,
  pinyin_numeric text,
  hsk_level      smallint not null check (hsk_level between 1 and 6),
  frequency      integer,
  pos            text,
  meaning_en     text,
  meaning_ko     text,
  classifiers    text,
  audio_url      text,
  example_sentence      text,
  example_pinyin        text,
  example_meaning_ko    text,
  created_at     timestamptz not null default now()
);

create index if not exists words_hsk_level_idx on public.words (hsk_level);
create unique index if not exists words_hanzi_pinyin_level_uidx
  on public.words (hanzi, pinyin, hsk_level);

-- words are public reference data — anyone (incl. anon) can read them
alter table public.words enable row level security;
create policy "words are readable by everyone"
  on public.words for select
  using (true);

-- ---------- sentences (everyday conversational practice, no HSK level) ----------
create table if not exists public.sentences (
  id         bigint generated always as identity primary key,
  hanzi      text not null,
  pinyin     text not null,
  meaning_ko text not null,
  audio_url  text,
  created_at timestamptz not null default now()
);

create unique index if not exists sentences_hanzi_pinyin_uidx
  on public.sentences (hanzi, pinyin);

alter table public.sentences enable row level security;
create policy "sentences are readable by everyone"
  on public.sentences for select
  using (true);

-- ---------- profiles ----------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  display_name     text,
  target_hsk_level smallint check (target_hsk_level between 1 and 6),
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "users manage their own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- user_word_progress (SRS state per user per word) ----------
create table if not exists public.user_word_progress (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  word_id        bigint not null references public.words (id) on delete cascade,
  status         text not null default 'new' check (status in ('new','learning','review','mastered')),
  ease_factor    real not null default 2.5,
  interval_days  real not null default 0,
  repetitions    integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, word_id)
);

create index if not exists uwp_user_next_review_idx
  on public.user_word_progress (user_id, next_review_at);

alter table public.user_word_progress enable row level security;
create policy "users manage their own progress"
  on public.user_word_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- study_logs (optional, for the dashboard/streak) ----------
create table if not exists public.study_logs (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  study_date     date not null default current_date,
  words_reviewed integer not null default 0,
  correct_count  integer not null default 0,
  unique (user_id, study_date)
);

alter table public.study_logs enable row level security;
create policy "users manage their own study logs"
  on public.study_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
