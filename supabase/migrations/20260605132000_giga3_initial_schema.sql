create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email citext not null unique,
  name text,
  avatar_url text,
  credits integer not null default 25,
  tokens integer not null default 1000,
  plan text not null default 'free',
  tier text not null default 'free' check (tier in ('free', 'premium')),
  subscription_plan text not null default 'free' check (subscription_plan in ('free', 'basic', 'pro', 'premium')),
  subscription_expires_at timestamptz,
  starter_credits_granted boolean not null default true,
  interest_profile jsonb,
  convex_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  convex_conversation_id text unique,
  title text not null default 'New chat',
  mode text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  convex_message_id text unique,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  convex_job_id text unique,
  media_type text not null check (media_type in ('image', 'video')),
  category text not null,
  prompt text not null,
  provider_prediction_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed')),
  output_url text,
  credits_charged integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('paystack', 'stripe')),
  reference text not null unique,
  product_id text not null,
  type text not null check (type in ('subscription', 'credits')),
  amount_ghs numeric(12, 2),
  plan_id text check (plan_id in ('free', 'basic', 'pro', 'premium')),
  credits_granted integer,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  provider_response jsonb,
  convex_payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null,
  reference text not null,
  tokens integer not null,
  action text,
  balance_after integer,
  metadata jsonb,
  convex_transaction_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users(email);
create index if not exists chats_user_updated_idx on public.chats(user_id, updated_at desc);
create index if not exists chat_messages_chat_created_idx on public.chat_messages(chat_id, created_at asc);
create index if not exists generations_user_created_idx on public.generations(user_id, created_at desc);
create index if not exists payments_user_created_idx on public.payments(user_id, created_at desc);
create index if not exists token_transactions_user_created_idx on public.token_transactions(user_id, created_at desc);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_chats_updated_at on public.chats;
create trigger set_chats_updated_at
before update on public.chats
for each row execute function public.set_updated_at();

drop trigger if exists set_generations_updated_at on public.generations;
create trigger set_generations_updated_at
before update on public.generations
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create or replace function public.bind_user_to_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_user_id is null and auth.uid() is not null then
    new.auth_user_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists bind_user_to_auth_before_insert on public.users;
create trigger bind_user_to_auth_before_insert
before insert on public.users
for each row execute function public.bind_user_to_auth();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (email) do update
    set auth_user_id = excluded.auth_user_id,
        name = coalesce(public.users.name, excluded.name),
        avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

drop trigger if exists create_profile_for_auth_user on auth.users;
create trigger create_profile_for_auth_user
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

alter table public.users enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.generations enable row level security;
alter table public.payments enable row level security;
alter table public.token_transactions enable row level security;

create policy "users read own profile"
on public.users for select
using (auth.uid() = auth_user_id or auth.jwt() ->> 'email' = email::text);

create policy "users insert own profile"
on public.users for insert
with check (auth.jwt() ->> 'email' = email::text);

create policy "users update own profile"
on public.users for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "chats owner access"
on public.chats for all
using (exists (select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()))
with check (exists (select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()));

create policy "chat messages owner access"
on public.chat_messages for all
using (
  exists (
    select 1
    from public.chats c
    join public.users u on u.id = c.user_id
    where c.id = chat_id and u.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.chats c
    join public.users u on u.id = c.user_id
    where c.id = chat_id and u.auth_user_id = auth.uid()
  )
);

create policy "generations owner access"
on public.generations for all
using (exists (select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()))
with check (exists (select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()));

create policy "payments owner read"
on public.payments for select
using (exists (select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()));

create policy "token transactions owner read"
on public.token_transactions for select
using (exists (select 1 from public.users u where u.id = user_id and u.auth_user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('images', 'images', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('videos', 'videos', true, 524288000, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('avatars', 'avatars', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('uploads', 'uploads', false, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf', 'text/plain'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "authenticated users can read public media"
on storage.objects for select
using (bucket_id in ('images', 'videos', 'avatars') or auth.role() = 'authenticated');

create policy "authenticated users can upload own files"
on storage.objects for insert
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('images', 'videos', 'avatars', 'uploads')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "authenticated users can update own files"
on storage.objects for update
using (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text)
with check (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "authenticated users can delete own files"
on storage.objects for delete
using (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

