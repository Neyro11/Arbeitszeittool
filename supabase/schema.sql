create table if not exists public.work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  employee_name text not null,
  work_date date not null check (work_date <= current_date),
  work_start time not null,
  work_end time not null,
  break_minutes integer not null check (break_minutes >= 0),
  effective_minutes integer not null check (effective_minutes >= 0),
  created_at timestamptz not null default now(),
  constraint work_end_after_start check (work_end > work_start),
  constraint break_within_shift check (
    break_minutes <= extract(epoch from (work_end - work_start)) / 60
  )
);

alter table public.work_entries enable row level security;

grant select, insert on public.work_entries to authenticated;

create policy "Users can view their own work entries"
  on public.work_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own work entries"
  on public.work_entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);