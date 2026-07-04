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

create or replace function public.validate_transaction_business_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle public.billing_cycles%rowtype;
  v_category_name text;
begin
  select * into v_cycle
  from public.billing_cycles
  where id = new.billing_cycle_id;

  if v_cycle.id is null then
    raise exception 'Invalid billing cycle';
  end if;

  if new.date < v_cycle.start_date or new.date > v_cycle.end_date then
    raise exception 'Transaction date must fall within its billing cycle';
  end if;

  select lower(name) into v_category_name
  from public.categories
  where id = new.category_id;

  if v_category_name is null then
    raise exception 'Invalid category';
  end if;

  if new.transaction_type = 'food' then
    if new.split_type <> 'no_split' then
      raise exception 'Food transactions must use no_split';
    end if;

    if v_category_name <> 'food' then
      raise exception 'Food transactions must use the food category';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_installment_transaction_business_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment public.installments%rowtype;
  v_transaction public.transactions%rowtype;
begin
  select * into v_installment
  from public.installments
  where id = new.installment_id;

  if v_installment.id is null then
    raise exception 'Invalid installment';
  end if;

  if new.installment_number > v_installment.total_installments then
    raise exception 'Installment number must not exceed total installments';
  end if;

  select * into v_transaction
  from public.transactions
  where id = new.transaction_id;

  if v_transaction.id is null then
    raise exception 'Invalid linked transaction';
  end if;

  if v_transaction.installment_id is distinct from new.installment_id then
    raise exception 'Linked transaction must reference the same installment';
  end if;

  if v_transaction.transaction_type <> 'installment' then
    raise exception 'Linked transaction must use installment transaction type';
  end if;

  return new;
end;
$$;

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

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.translation_pairs (
  id uuid primary key default gen_random_uuid(),
  translation_key text not null unique,
  thai_text text not null,
  english_text text not null,
  source_file text not null default '',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint translation_pairs_key_length check (char_length(translation_key) between 1 and 100)
);

create index billing_cycles_date_range_idx on public.billing_cycles (start_date, end_date);
create index transactions_cycle_date_idx on public.transactions (billing_cycle_id, date desc);
create index transactions_payer_idx on public.transactions (payer_user_id);
create index transactions_type_idx on public.transactions (transaction_type);
create index installments_payer_idx on public.installments (payer_user_id);
create index notifications_recipient_unread_idx on public.notifications (recipient_user_id, read_at, created_at desc);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id, updated_at desc);
create index translation_pairs_key_idx on public.translation_pairs (translation_key);

alter table public.profiles enable row level security;
alter table public.billing_cycles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.installments enable row level security;
alter table public.installment_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.translation_pairs enable row level security;

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

create policy "users can manage own push subscriptions"
on public.push_subscriptions for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "household can manage translation pairs"
on public.translation_pairs for all
to authenticated
using (public.is_household_member(auth.uid()))
with check (public.is_household_member(auth.uid()));

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

drop trigger if exists transactions_validate_business_rules on public.transactions;

create trigger transactions_validate_business_rules
before insert or update on public.transactions
for each row execute function public.validate_transaction_business_rules();

drop trigger if exists installment_transactions_validate_business_rules on public.installment_transactions;

create trigger installment_transactions_validate_business_rules
before insert or update on public.installment_transactions
for each row execute function public.validate_installment_transaction_business_rules();

create or replace function public.touch_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger push_subscriptions_touch_updated_at
before update on public.push_subscriptions
for each row execute function public.touch_push_subscriptions_updated_at();

create or replace function public.touch_translation_pairs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger translation_pairs_touch_updated_at
before update on public.translation_pairs
for each row execute function public.touch_translation_pairs_updated_at();

create or replace function public.replace_installment_with_transactions(
  p_installment_id uuid default null,
  p_title text default '',
  p_total_installments integer default 1,
  p_current_installment integer default 1,
  p_monthly_amount numeric default 0,
  p_start_date date default current_date,
  p_end_date date default current_date,
  p_payer_user_id uuid default null,
  p_split_type split_type default 'split_half'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment_id uuid;
  v_shopping_category_id uuid;
  v_installment_number integer;
  v_month_offset integer;
  v_transaction_date date;
  v_cycle_id uuid;
  v_transaction_id uuid;
begin
  select id into v_shopping_category_id
  from public.categories
  where lower(name) = 'shopping'
  order by is_default desc, created_at asc
  limit 1;

  if v_shopping_category_id is null then
    raise exception 'Installment category is missing';
  end if;

  if p_installment_id is null then
    insert into public.installments (
      title,
      total_installments,
      current_installment,
      monthly_amount,
      start_date,
      end_date,
      payer_user_id,
      split_type
    )
    values (
      p_title,
      p_total_installments,
      p_current_installment,
      p_monthly_amount,
      p_start_date,
      p_end_date,
      p_payer_user_id,
      p_split_type
    )
    returning id into v_installment_id;
  else
    update public.installments
    set
      title = p_title,
      total_installments = p_total_installments,
      current_installment = p_current_installment,
      monthly_amount = p_monthly_amount,
      start_date = p_start_date,
      end_date = p_end_date,
      payer_user_id = p_payer_user_id,
      split_type = p_split_type
    where id = p_installment_id
    returning id into v_installment_id;

    if v_installment_id is null then
      raise exception 'Installment not found';
    end if;

    delete from public.installment_transactions where installment_id = v_installment_id;
    delete from public.transactions where installment_id = v_installment_id;
  end if;

  for v_installment_number in p_current_installment..p_total_installments loop
    v_month_offset := v_installment_number - p_current_installment;
    v_transaction_date := (p_start_date + make_interval(months => v_month_offset))::date;

    exit when v_transaction_date > p_end_date;

    select id into v_cycle_id
    from public.billing_cycles
    where start_date <= v_transaction_date and end_date >= v_transaction_date
    order by start_date asc
    limit 1;

    if v_cycle_id is null then
      continue;
    end if;

    insert into public.transactions (
      billing_cycle_id,
      date,
      title,
      category_id,
      amount,
      payer_user_id,
      transaction_type,
      split_type,
      note,
      attachment_url,
      installment_id
    )
    values (
      v_cycle_id,
      v_transaction_date,
      p_title || ' ' || v_installment_number || '/' || p_total_installments,
      v_shopping_category_id,
      p_monthly_amount,
      p_payer_user_id,
      'installment',
      p_split_type,
      'Auto-generated installment payment',
      null,
      v_installment_id
    )
    returning id into v_transaction_id;

    insert into public.installment_transactions (installment_id, transaction_id, installment_number)
    values (v_installment_id, v_transaction_id, v_installment_number);
  end loop;

  return v_installment_id;
end;
$$;

create or replace function public.delete_installment_with_transactions(p_installment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.installment_transactions where installment_id = p_installment_id;
  delete from public.transactions where installment_id = p_installment_id;
  delete from public.installments where id = p_installment_id;

  return true;
end;
$$;

create or replace function public.commit_flowpay_history(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle jsonb;
  v_installment jsonb;
  v_transaction jsonb;
  v_cycle_id uuid;
  v_installment_id uuid;
  v_transaction_id uuid;
  v_imported_cycles integer := 0;
  v_skipped_cycles integer := 0;
  v_imported_installments integer := 0;
  v_skipped_installments integer := 0;
  v_imported_transactions integer := 0;
  v_skipped_transactions integer := 0;
begin
  for v_cycle in select value from jsonb_array_elements(coalesce(p_payload->'billingCycles', '[]'::jsonb)) loop
    select id into v_cycle_id
    from public.billing_cycles
    where start_date = (v_cycle->>'startDate')::date and end_date = (v_cycle->>'endDate')::date
    limit 1;

    if v_cycle_id is not null then
      v_skipped_cycles := v_skipped_cycles + 1;
    else
      insert into public.billing_cycles (
        start_date,
        end_date,
        food_budget_target,
        food_wallet_holder_user_id,
        carry_over_amount
      )
      values (
        (v_cycle->>'startDate')::date,
        (v_cycle->>'endDate')::date,
        (v_cycle->>'foodBudgetTarget')::numeric,
        (v_cycle->>'foodWalletHolderUserId')::uuid,
        coalesce((v_cycle->>'carryOverAmount')::numeric, 0)
      );

      v_imported_cycles := v_imported_cycles + 1;
    end if;
  end loop;

  for v_installment in select value from jsonb_array_elements(coalesce(p_payload->'installments', '[]'::jsonb)) loop
    select id into v_installment_id
    from public.installments
    where lower(title) = lower(v_installment->>'title')
      and total_installments = (v_installment->>'totalInstallments')::integer
      and current_installment = (v_installment->>'currentInstallment')::integer
      and monthly_amount = (v_installment->>'monthlyAmount')::numeric
      and start_date = (v_installment->>'startDate')::date
      and end_date = (v_installment->>'endDate')::date
      and payer_user_id = (v_installment->>'payerUserId')::uuid
      and split_type = (v_installment->>'splitType')::split_type
    limit 1;

    if v_installment_id is not null then
      v_skipped_installments := v_skipped_installments + 1;
    else
      insert into public.installments (
        title,
        total_installments,
        current_installment,
        monthly_amount,
        start_date,
        end_date,
        payer_user_id,
        split_type
      )
      values (
        v_installment->>'title',
        (v_installment->>'totalInstallments')::integer,
        (v_installment->>'currentInstallment')::integer,
        (v_installment->>'monthlyAmount')::numeric,
        (v_installment->>'startDate')::date,
        (v_installment->>'endDate')::date,
        (v_installment->>'payerUserId')::uuid,
        (v_installment->>'splitType')::split_type
      )
      returning id into v_installment_id;

      v_imported_installments := v_imported_installments + 1;
    end if;
  end loop;

  for v_transaction in select value from jsonb_array_elements(coalesce(p_payload->'transactions', '[]'::jsonb)) loop
    select id into v_cycle_id
    from public.billing_cycles
    where start_date = (v_transaction->>'cycleStartDate')::date
    limit 1;

    if v_cycle_id is null then
      raise exception 'Missing billing cycle for transaction dated %', v_transaction->>'date';
    end if;

    v_installment_id := null;
    if coalesce(v_transaction->>'installmentTitle', '') <> '' then
      select id into v_installment_id
      from public.installments
      where lower(title) = lower(v_transaction->>'installmentTitle')
      order by created_at desc
      limit 1;
    end if;

    select id into v_transaction_id
    from public.transactions
    where billing_cycle_id = v_cycle_id
      and date = (v_transaction->>'date')::date
      and lower(title) = lower(v_transaction->>'title')
      and category_id = (v_transaction->>'categoryId')::uuid
      and amount = (v_transaction->>'amount')::numeric
      and payer_user_id = (v_transaction->>'payerUserId')::uuid
      and transaction_type = (v_transaction->>'transactionType')::transaction_type
      and split_type = (v_transaction->>'splitType')::split_type
      and coalesce(note, '') = coalesce(v_transaction->>'note', '')
      and coalesce(installment_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(v_installment_id, '00000000-0000-0000-0000-000000000000'::uuid)
    limit 1;

    if v_transaction_id is not null then
      v_skipped_transactions := v_skipped_transactions + 1;
      continue;
    end if;

    insert into public.transactions (
      billing_cycle_id,
      date,
      title,
      category_id,
      amount,
      payer_user_id,
      transaction_type,
      split_type,
      note,
      attachment_url,
      installment_id
    )
    values (
      v_cycle_id,
      (v_transaction->>'date')::date,
      v_transaction->>'title',
      (v_transaction->>'categoryId')::uuid,
      (v_transaction->>'amount')::numeric,
      (v_transaction->>'payerUserId')::uuid,
      (v_transaction->>'transactionType')::transaction_type,
      (v_transaction->>'splitType')::split_type,
      nullif(v_transaction->>'note', ''),
      null,
      v_installment_id
    )
    returning id into v_transaction_id;

    v_imported_transactions := v_imported_transactions + 1;

    if (v_transaction->>'transactionType') = 'installment' and v_installment_id is not null and coalesce(v_transaction->>'installmentNumber', '') <> '' then
      insert into public.installment_transactions (installment_id, transaction_id, installment_number)
      values (v_installment_id, v_transaction_id, (v_transaction->>'installmentNumber')::integer);
    end if;
  end loop;

  return jsonb_build_object(
    'importedCycles', v_imported_cycles,
    'skippedCycles', v_skipped_cycles,
    'importedInstallments', v_imported_installments,
    'skippedInstallments', v_skipped_installments,
    'importedTransactions', v_imported_transactions,
    'skippedTransactions', v_skipped_transactions
  );
end;
$$;
