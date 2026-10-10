-- Olistica Client Intake Data Store: Supabase setup
-- Run in Supabase Dashboard > SQL Editor. Review and back up existing data before migration.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.client_records (
  client_key text primary key,
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.client_records enable row level security;

-- A user's profile row is created automatically as staff. Admin promotion is a manual SQL step below.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'staff')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Authenticated staff may read and edit client records. Unauthenticated public access is denied.
drop policy if exists "Authenticated staff can read client records" on public.client_records;
create policy "Authenticated staff can read client records" on public.client_records
for select to authenticated using (true);
drop policy if exists "Authenticated staff can insert client records" on public.client_records;
create policy "Authenticated staff can insert client records" on public.client_records
for insert to authenticated with check (true);
drop policy if exists "Authenticated staff can update client records" on public.client_records;
create policy "Authenticated staff can update client records" on public.client_records
for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated staff can delete client records" on public.client_records;
create policy "Authenticated staff can delete client records" on public.client_records
for delete to authenticated using (true);

-- Users may read their own profile only; the app only needs the role value for the signed-in user.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated using (auth.uid() = id);

-- Enable realtime notifications for cross-device refresh (safe to run if already added).
do $$ begin
  alter publication supabase_realtime add table public.client_records;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

-- AFTER creating your first administrator account in Supabase Dashboard > Authentication > Users,
-- replace the email below with that account's exact email and run this statement:
-- update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL';
