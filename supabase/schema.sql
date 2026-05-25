create extension if not exists "pgcrypto";

create type transaction_type as enum ('food', 'normal', 'installment');
create type split_type as enum ('split_half', 'no_split', 'full_reimburse');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default now()
);

create table public.billing_cycles (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  food_budget_target numeric(12,2) not null check (food_budget_target >= 0),
  food_wallet_holder_user_id uuid not null references public.profiles(id) on delete restrict,
  carry_over_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint billing_cycles_valid_dates check (end_date >= start_date)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'CircleEllipsis',
  color text not null default '#64748b',
  is_default boolean not null default false,
  created_by_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint categories_name_length check (char_length(name) between 1 and 40)
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  total_installments integer not null check (total_installments > 0),
  current_installment integer not null default 0 check (current_installment >= 0),
  monthly_amount numeric(12,2) not null check (monthly_amount > 0),
  start_date date not null,
  end_date date not null,
  payer_user_id uuid not null references public.profiles(id) on delete restrict,
  split_type split_type not null,
  created_at timestamptz not null default now(),
  constraint installments_valid_dates check (end_date >= start_date),
  constraint installments_progress check (current_installment <= total_installments)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  billing_cycle_id uuid not null references public.billing_cycles(id) on delete cascade,
  date date not null,
  title text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payer_user_id uuid not null references public.profiles(id) on delete restrict,
  transaction_type transaction_type not null,
  split_type split_type not null,
  note text,
  attachment_url text,
  installment_id uuid references public.installments(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.installment_transactions (
  id uuid primary key default gen_random_uuid(),
  installment_id uuid not null references public.installments(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  created_at timestamptz not null default now(),
  unique (installment_id, installment_number),
  unique (transaction_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index billing_cycles_date_range_idx on public.billing_cycles (start_date, end_date);
create index transactions_cycle_date_idx on public.transactions (billing_cycle_id, date desc);
create index transactions_payer_idx on public.transactions (payer_user_id);
create index transactions_type_idx on public.transactions (transaction_type);
create index installments_payer_idx on public.installments (payer_user_id);
create index notifications_recipient_unread_idx on public.notifications (recipient_user_id, read_at, created_at desc);

alter table public.profiles enable row level security;
alter table public.billing_cycles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.installments enable row level security;
alter table public.installment_transactions enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_household_member(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = user_id)
    and (select count(*) from public.profiles) <= 2;
$$;

create policy "profiles are visible to household"
on public.profiles for select
to authenticated
using (public.is_household_member(auth.uid()));

create policy "users can upsert own profile"
on public.profiles for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "household can read cycles"
on public.billing_cycles for select
to authenticated
using (public.is_household_member(auth.uid()));

create policy "household can manage cycles"
on public.billing_cycles for all
to authenticated
using (public.is_household_member(auth.uid()))
with check (public.is_household_member(auth.uid()));

create policy "household can read categories"
on public.categories for select
to authenticated
using (is_default or public.is_household_member(auth.uid()));

create policy "household can manage custom categories"
on public.categories for all
to authenticated
using (created_by_user_id = auth.uid() or public.is_household_member(auth.uid()))
with check (created_by_user_id = auth.uid() or public.is_household_member(auth.uid()));

create policy "household can manage transactions"
on public.transactions for all
to authenticated
using (public.is_household_member(auth.uid()))
with check (public.is_household_member(auth.uid()));

create policy "household can manage installments"
on public.installments for all
to authenticated
using (public.is_household_member(auth.uid()))
with check (public.is_household_member(auth.uid()));

create policy "household can manage installment links"
on public.installment_transactions for all
to authenticated
using (public.is_household_member(auth.uid()))
with check (public.is_household_member(auth.uid()));

create policy "users can read own notifications"
on public.notifications for select
to authenticated
using (recipient_user_id = auth.uid());

create policy "household can create notifications"
on public.notifications for insert
to authenticated
with check (actor_user_id = auth.uid() and public.is_household_member(recipient_user_id));

create policy "users can update own notifications"
on public.notifications for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

insert into public.categories (name, icon, color, is_default)
values
  ('Food', 'Utensils', '#14b8a6', true),
  ('Transport', 'Car', '#38bdf8', true),
  ('Shopping', 'ShoppingBag', '#f97316', true),
  ('Bills', 'Receipt', '#8b5cf6', true),
  ('Entertainment', 'Film', '#ec4899', true),
  ('Health', 'HeartPulse', '#ef4444', true),
  ('Investment', 'TrendingUp', '#22c55e', true),
  ('Other', 'CircleEllipsis', '#64748b', true);

create or replace function public.create_transaction_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  actor_name text;
begin
  select id into recipient from public.profiles where id <> new.payer_user_id limit 1;
  select display_name into actor_name from public.profiles where id = new.payer_user_id;

  if recipient is not null then
    insert into public.notifications (actor_user_id, recipient_user_id, transaction_id, title, body)
    values (
      new.payer_user_id,
      recipient,
      new.id,
      'New transaction',
      coalesce(actor_name, 'Partner') || ' added ' || new.title || ' ' || trim(to_char(new.amount, '999999999D99')) || ' THB'
    );
  end if;

  return new;
end;
$$;

create trigger transaction_notification_after_insert
after insert on public.transactions
for each row execute function public.create_transaction_notification();
