create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  counterparty_account_id uuid references public.accounts(id) on delete restrict,
  bucket_id uuid,
  debt_id uuid,
  category_id uuid references public.categories(id) on delete set null,
  type text not null
    check (type in (
      'income',
      'expense',
      'transfer_out',
      'transfer_in',
      'savings_allocation',
      'debt_payment',
      'adjustment',
      'sale_income',
      'business_expense'
    )),
  amount numeric(14, 2) not null check (amount > 0),
  direction text not null check (direction in ('in', 'out')),
  transaction_date date not null default current_date,
  reference_group_id uuid,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_workspace_date_lookup
  on public.transactions (workspace_id, transaction_date desc, created_at desc);

create index if not exists transactions_account_lookup
  on public.transactions (account_id);

create index if not exists transactions_category_lookup
  on public.transactions (category_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;

create policy "Members can read transactions"
  on public.transactions for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners admins and editors can create transactions"
  on public.transactions for insert
  with check (
    public.can_manage_workspace_data(workspace_id)
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update transactions"
  on public.transactions for update
  using (public.can_manage_workspace_data(workspace_id))
  with check (public.can_manage_workspace_data(workspace_id));

create or replace function public.create_money_transaction(
  target_workspace_id uuid,
  target_account_id uuid,
  target_category_id uuid,
  transaction_type text,
  transaction_amount numeric,
  transaction_date date,
  transaction_notes text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  transaction_direction text;
  balance_delta numeric(14, 2);
  new_transaction public.transactions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_workspace_data(target_workspace_id) then
    raise exception 'Not allowed to create transactions for this workspace';
  end if;

  if transaction_amount <= 0 then
    raise exception 'Transaction amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = target_account_id
      and workspace_id = target_workspace_id
      and is_archived = false
  ) then
    raise exception 'Account does not belong to this workspace';
  end if;

  if target_category_id is not null and not exists (
    select 1
    from public.categories
    where id = target_category_id
      and is_archived = false
      and (workspace_id is null or workspace_id = target_workspace_id)
  ) then
    raise exception 'Category is not available for this workspace';
  end if;

  transaction_direction := case
    when transaction_type in ('income', 'adjustment', 'sale_income') then 'in'
    when transaction_type in ('expense', 'business_expense', 'debt_payment', 'savings_allocation') then 'out'
    else null
  end;

  if transaction_direction is null then
    raise exception 'Use create_transfer_transaction for transfers';
  end if;

  balance_delta := case
    when transaction_direction = 'in' then transaction_amount
    else transaction_amount * -1
  end;

  insert into public.transactions (
    workspace_id,
    account_id,
    category_id,
    type,
    amount,
    direction,
    transaction_date,
    notes,
    created_by
  )
  values (
    target_workspace_id,
    target_account_id,
    target_category_id,
    transaction_type,
    transaction_amount,
    transaction_direction,
    transaction_date,
    transaction_notes,
    auth.uid()
  )
  returning * into new_transaction;

  update public.accounts
  set current_balance = current_balance + balance_delta
  where id = target_account_id;

  return new_transaction;
end;
$$;

create or replace function public.create_transfer_transaction(
  target_workspace_id uuid,
  source_account_id uuid,
  destination_account_id uuid,
  transfer_amount numeric,
  transfer_date date,
  transfer_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  transfer_group_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_workspace_data(target_workspace_id) then
    raise exception 'Not allowed to create transfers for this workspace';
  end if;

  if transfer_amount <= 0 then
    raise exception 'Transfer amount must be greater than zero';
  end if;

  if source_account_id = destination_account_id then
    raise exception 'Transfer accounts must be different';
  end if;

  if (
    select count(*)
    from public.accounts
    where id in (source_account_id, destination_account_id)
      and workspace_id = target_workspace_id
      and is_archived = false
  ) <> 2 then
    raise exception 'Both transfer accounts must belong to this workspace';
  end if;

  insert into public.transactions (
    workspace_id,
    account_id,
    counterparty_account_id,
    type,
    amount,
    direction,
    transaction_date,
    reference_group_id,
    notes,
    created_by
  )
  values
    (
      target_workspace_id,
      source_account_id,
      destination_account_id,
      'transfer_out',
      transfer_amount,
      'out',
      transfer_date,
      transfer_group_id,
      transfer_notes,
      auth.uid()
    ),
    (
      target_workspace_id,
      destination_account_id,
      source_account_id,
      'transfer_in',
      transfer_amount,
      'in',
      transfer_date,
      transfer_group_id,
      transfer_notes,
      auth.uid()
    );

  update public.accounts
  set current_balance = current_balance - transfer_amount
  where id = source_account_id;

  update public.accounts
  set current_balance = current_balance + transfer_amount
  where id = destination_account_id;

  return transfer_group_id;
end;
$$;

create or replace function public.recalculate_account_balance(target_account_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance numeric(14, 2);
  target_workspace_id uuid;
begin
  select workspace_id into target_workspace_id
  from public.accounts
  where id = target_account_id;

  if target_workspace_id is null then
    raise exception 'Account not found';
  end if;

  if not public.can_manage_workspace_data(target_workspace_id) then
    raise exception 'Not allowed to recalculate this account';
  end if;

  select
    a.starting_balance
    + coalesce(sum(
      case
        when t.direction = 'in' then t.amount
        when t.direction = 'out' then t.amount * -1
        else 0
      end
    ), 0)
  into next_balance
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  where a.id = target_account_id
  group by a.starting_balance;

  update public.accounts
  set current_balance = next_balance
  where id = target_account_id;

  return next_balance;
end;
$$;
