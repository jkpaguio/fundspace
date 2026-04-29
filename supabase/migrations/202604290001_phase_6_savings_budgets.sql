create table if not exists public.savings_buckets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  linked_account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  target_amount numeric(14, 2) not null default 0 check (target_amount >= 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  allocation_percentage numeric(5, 2) not null default 0
    check (allocation_percentage >= 0 and allocation_percentage <= 100),
  target_date date,
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2000 and 2100),
  limit_amount numeric(14, 2) not null check (limit_amount > 0),
  warning_percentage numeric(5, 2) not null default 80
    check (warning_percentage > 0 and warning_percentage <= 100),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, category_id, month, year)
);

create index if not exists savings_buckets_workspace_lookup
  on public.savings_buckets (workspace_id, is_archived);

create index if not exists budgets_workspace_period_lookup
  on public.budgets (workspace_id, year, month);

create index if not exists budgets_category_lookup
  on public.budgets (category_id);

create trigger savings_buckets_set_updated_at
  before update on public.savings_buckets
  for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_bucket_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_bucket_id_fkey
      foreign key (bucket_id)
      references public.savings_buckets(id)
      on delete set null;
  end if;
end $$;

alter table public.savings_buckets enable row level security;
alter table public.budgets enable row level security;

create policy "Members can read savings buckets"
  on public.savings_buckets for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners admins and editors can create savings buckets"
  on public.savings_buckets for insert
  with check (
    public.can_manage_workspace_data(workspace_id)
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update savings buckets"
  on public.savings_buckets for update
  using (public.can_manage_workspace_data(workspace_id))
  with check (public.can_manage_workspace_data(workspace_id));

create policy "Members can read budgets"
  on public.budgets for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners admins and editors can create budgets"
  on public.budgets for insert
  with check (
    public.can_manage_workspace_data(workspace_id)
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update budgets"
  on public.budgets for update
  using (public.can_manage_workspace_data(workspace_id))
  with check (public.can_manage_workspace_data(workspace_id));

create or replace function public.create_savings_allocation(
  target_workspace_id uuid,
  source_account_id uuid,
  target_bucket_id uuid,
  allocation_amount numeric,
  allocation_date date,
  allocation_notes text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  new_transaction public.transactions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_workspace_data(target_workspace_id) then
    raise exception 'Not allowed to allocate savings for this workspace';
  end if;

  if allocation_amount <= 0 then
    raise exception 'Allocation amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = source_account_id
      and workspace_id = target_workspace_id
      and is_archived = false
  ) then
    raise exception 'Source account does not belong to this workspace';
  end if;

  if not exists (
    select 1
    from public.savings_buckets
    where id = target_bucket_id
      and workspace_id = target_workspace_id
      and is_archived = false
  ) then
    raise exception 'Savings bucket does not belong to this workspace';
  end if;

  insert into public.transactions (
    workspace_id,
    account_id,
    bucket_id,
    type,
    amount,
    direction,
    transaction_date,
    notes,
    created_by
  )
  values (
    target_workspace_id,
    source_account_id,
    target_bucket_id,
    'savings_allocation',
    allocation_amount,
    'out',
    allocation_date,
    allocation_notes,
    auth.uid()
  )
  returning * into new_transaction;

  update public.accounts
  set current_balance = current_balance - allocation_amount
  where id = source_account_id;

  update public.savings_buckets
  set current_amount = current_amount + allocation_amount
  where id = target_bucket_id;

  return new_transaction;
end;
$$;
