alter table public.users
  add column if not exists user_role text not null default 'general',
  add column if not exists onboarding_state jsonb,
  add column if not exists user_preferences jsonb,
  add column if not exists referral_code text,
  add column if not exists learning_streak_days integer not null default 0,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists last_active_date_key text;

create unique index if not exists users_referral_code_idx
  on public.users(referral_code)
  where referral_code is not null;
