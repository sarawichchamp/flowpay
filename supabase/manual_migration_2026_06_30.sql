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

drop trigger if exists transactions_validate_business_rules on public.transactions;

create trigger transactions_validate_business_rules
before insert or update on public.transactions
for each row execute function public.validate_transaction_business_rules();

drop trigger if exists installment_transactions_validate_business_rules on public.installment_transactions;

create trigger installment_transactions_validate_business_rules
before insert or update on public.installment_transactions
for each row execute function public.validate_installment_transaction_business_rules();

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
