-- ============================================================================
--  Jigshuffle — Supabase leaderboard setup
--  Run this once in your Supabase project: Dashboard → SQL Editor → New query
--  → paste → Run. Then copy your Project URL + anon key into index.html.
-- ============================================================================

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  category   text not null,
  seconds    numeric(7,2) not null check (seconds >= 0 and seconds < 36000),
  created_at timestamptz not null default now()
);

create index if not exists scores_category_idx on public.scores (category);

-- Row-level security: the public anon key may INSERT and SELECT scores only.
-- No updates or deletes are possible with the embeddable key.
alter table public.scores enable row level security;

drop policy if exists "anon insert scores" on public.scores;
create policy "anon insert scores" on public.scores
  for insert to anon
  with check (char_length(category) <= 32 and seconds >= 0 and seconds < 36000);

drop policy if exists "anon read scores" on public.scores;
create policy "anon read scores" on public.scores
  for select to anon
  using (true);

-- Aggregated stats for one category. When p_seconds is supplied, beat_pct is
-- the percentage of recorded times SLOWER than p_seconds (your global rank).
create or replace function public.leaderboard_stats(p_category text, p_seconds numeric default null)
returns table (total bigint, avg numeric, best numeric, beat_pct numeric)
language sql
stable
as $$
  select
    count(*)::bigint                                   as total,
    round(avg(seconds), 2)                             as avg,
    round(min(seconds), 2)                             as best,
    case
      when p_seconds is null or count(*) = 0 then null
      else round(100.0 * sum(case when seconds > p_seconds then 1 else 0 end) / count(*), 1)
    end                                                as beat_pct
  from public.scores
  where category = p_category;
$$;

grant execute on function public.leaderboard_stats(text, numeric) to anon;

-- ----------------------------------------------------------------------------
-- Optional but recommended: throttle spam by capping inserts per IP. Supabase
-- doesn't expose IP to RLS directly, so for now the check policy above limits
-- payload shape. If abuse appears, add a Postgres trigger or an Edge Function
-- in front of inserts. For a casual game this table is fine as-is.
-- ----------------------------------------------------------------------------
