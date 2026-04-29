create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  counterparty_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(14, 2) not null check (amount > 0),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('borrowed', 'lent', 'loan', 'credit_card')),
  person_name text not null,
  original_amount numeric(14, 2) not null check (original_amount > 0),
  remaining_amount numeric(14, 2) not null check (remaining_amount >= 0),
  interest_rate numeric(7, 2),
  due_date date,
  status text not null default 'active' check (status in ('active', 'paid', 'cancelled')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  payment_date date not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  capital_amount numeric(14, 2) not null default 0 check (capital_amount >= 0),
  logo_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  units_produced numeric(14, 2) not null default 1 check (units_produced > 0),
  selling_price numeric(14, 2) not null default 0 check (selling_price >= 0),
  cost_per_unit numeric(14, 2) not null default 0,
  profit_per_unit numeric(14, 2) not null default 0,
  profit_margin numeric(7, 2) not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  quantity numeric(14, 2) not null default 1 check (quantity > 0),
  unit text not null default 'pcs',
  total_cost numeric(14, 2) not null default 0 check (total_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  quantity numeric(14, 2) not null check (quantity > 0),
  selling_price numeric(14, 2) not null check (selling_price >= 0),
  cost_per_unit numeric(14, 2) not null default 0,
  revenue numeric(14, 2) not null default 0,
  cogs numeric(14, 2) not null default 0,
  gross_profit numeric(14, 2) not null default 0,
  sale_date date not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  expense_date date not null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_logs_workspace_lookup
  on public.activity_logs (workspace_id, created_at desc);

create index if not exists recurring_transactions_workspace_lookup
  on public.recurring_transactions (workspace_id, next_run_date, is_active);

create index if not exists debts_workspace_lookup
  on public.debts (workspace_id, status);

create index if not exists debt_payments_debt_lookup
  on public.debt_payments (debt_id, payment_date desc);

create index if not exists businesses_workspace_lookup
  on public.businesses (workspace_id, created_at desc);

create index if not exists products_business_lookup
  on public.products (business_id, is_active);

create index if not exists product_ingredients_product_lookup
  on public.product_ingredients (product_id);

create index if not exists sales_business_lookup
  on public.sales (business_id, sale_date desc);

create index if not exists business_expenses_business_lookup
  on public.business_expenses (business_id, expense_date desc);

create trigger recurring_transactions_set_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

create trigger debts_set_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger product_ingredients_set_updated_at
  before update on public.product_ingredients
  for each row execute function public.set_updated_at();

create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

create trigger business_expenses_set_updated_at
  before update on public.business_expenses
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_debt_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_debt_id_fkey
      foreign key (debt_id)
      references public.debts(id)
      on delete set null;
  end if;
end $$;

create or replace function public.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_profile_id = auth.uid()
    or exists (
      select 1
      from public.workspace_members current_member
      join public.workspace_members target_member
        on current_member.workspace_id = target_member.workspace_id
      where current_member.user_id = auth.uid()
        and current_member.status = 'active'
        and target_member.user_id = target_profile_id
        and target_member.status = 'active'
    );
$$;

create or replace function public.business_workspace_id(target_business_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id
  from public.businesses
  where id = target_business_id
  limit 1;
$$;

create or replace function public.product_workspace_id(target_product_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.workspace_id
  from public.products p
  join public.businesses b on b.id = p.business_id
  where p.id = target_product_id
  limit 1;
$$;

create or replace function public.debt_workspace_id(target_debt_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workspace_id
  from public.debts
  where id = target_debt_id
  limit 1;
$$;

create or replace function public.log_activity(
  target_workspace_id uuid,
  target_action text,
  target_entity_type text,
  target_entity_id uuid,
  target_description text
)
returns public.activity_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  new_log public.activity_logs;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Not allowed to log activity for this workspace';
  end if;

  insert into public.activity_logs (
    workspace_id,
    user_id,
    action,
    entity_type,
    entity_id,
    description
  )
  values (
    target_workspace_id,
    auth.uid(),
    target_action,
    target_entity_type,
    target_entity_id,
    target_description
  )
  returning * into new_log;

  return new_log;
end;
$$;

create or replace function public.recalculate_product_metrics(target_product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  total_cost numeric(14, 2);
  next_product public.products;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_workspace_data(public.product_workspace_id(target_product_id)) then
    raise exception 'Not allowed to update this product';
  end if;

  select coalesce(sum(total_cost), 0)
  into total_cost
  from public.product_ingredients
  where product_id = target_product_id;

  update public.products
  set
    cost_per_unit = case when units_produced > 0 then round(total_cost / units_produced, 2) else 0 end,
    profit_per_unit = selling_price - case when units_produced > 0 then round(total_cost / units_produced, 2) else 0 end,
    profit_margin = case
      when selling_price > 0 then round(((selling_price - case when units_produced > 0 then round(total_cost / units_produced, 2) else 0 end) / selling_price) * 100, 2)
      else 0
    end
  where id = target_product_id
  returning * into next_product;

  return next_product;
end;
$$;

create or replace function public.accept_workspace_invite(target_workspace_id uuid)
returns public.workspace_members
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_member public.workspace_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.workspace_members
  set status = 'active'
  where workspace_id = target_workspace_id
    and user_id = auth.uid()
    and status = 'invited'
  returning * into updated_member;

  if updated_member.id is null then
    raise exception 'No pending invite found';
  end if;

  perform public.log_activity(
    updated_member.workspace_id,
    'accepted_invite',
    'workspace_member',
    updated_member.id,
    'Accepted workspace invite'
  );

  return updated_member;
end;
$$;

create or replace function public.update_workspace_member_role(
  target_membership_id uuid,
  next_role text
)
returns public.workspace_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_member public.workspace_members;
  updated_member public.workspace_members;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if next_role not in ('admin', 'editor', 'viewer') then
    raise exception 'Invalid role';
  end if;

  select *
  into current_member
  from public.workspace_members
  where id = target_membership_id;

  if current_member.id is null then
    raise exception 'Membership not found';
  end if;

  if not public.can_manage_workspace_members(current_member.workspace_id) then
    raise exception 'Not allowed to update this member';
  end if;

  if current_member.role = 'owner' then
    raise exception 'Owner role cannot be changed';
  end if;

  update public.workspace_members
  set role = next_role
  where id = target_membership_id
  returning * into updated_member;

  perform public.log_activity(
    updated_member.workspace_id,
    'updated_member_role',
    'workspace_member',
    updated_member.id,
    'Updated workspace member role'
  );

  return updated_member;
end;
$$;

create or replace function public.create_debt_payment(
  target_debt_id uuid,
  payment_account_id uuid,
  payment_amount numeric,
  payment_date date,
  payment_notes text default null
)
returns public.debt_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  target_debt public.debts;
  ledger_transaction public.transactions;
  new_payment public.debt_payments;
  next_remaining numeric(14, 2);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into target_debt
  from public.debts
  where id = target_debt_id;

  if target_debt.id is null then
    raise exception 'Debt not found';
  end if;

  if not public.can_manage_workspace_data(target_debt.workspace_id) then
    raise exception 'Not allowed to pay this debt';
  end if;

  if payment_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = payment_account_id
      and workspace_id = target_debt.workspace_id
      and is_archived = false
  ) then
    raise exception 'Account does not belong to this workspace';
  end if;

  insert into public.transactions (
    workspace_id,
    account_id,
    debt_id,
    type,
    amount,
    direction,
    transaction_date,
    notes,
    created_by
  )
  values (
    target_debt.workspace_id,
    payment_account_id,
    target_debt.id,
    'debt_payment',
    payment_amount,
    'out',
    payment_date,
    payment_notes,
    auth.uid()
  )
  returning * into ledger_transaction;

  update public.accounts
  set current_balance = current_balance - payment_amount
  where id = payment_account_id;

  next_remaining := greatest(target_debt.remaining_amount - payment_amount, 0);

  update public.debts
  set
    remaining_amount = next_remaining,
    status = case when next_remaining = 0 then 'paid' else status end
  where id = target_debt.id;

  insert into public.debt_payments (
    debt_id,
    transaction_id,
    amount,
    payment_date,
    notes,
    created_by
  )
  values (
    target_debt.id,
    ledger_transaction.id,
    payment_amount,
    payment_date,
    payment_notes,
    auth.uid()
  )
  returning * into new_payment;

  perform public.log_activity(
    target_debt.workspace_id,
    'created_debt_payment',
    'debt_payment',
    new_payment.id,
    'Recorded a debt payment'
  );

  return new_payment;
end;
$$;

create or replace function public.create_sale_transaction(
  target_business_id uuid,
  payment_account_id uuid,
  target_product_id uuid,
  sale_quantity numeric,
  sale_selling_price numeric,
  sale_date date,
  sale_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  target_product public.products;
  ledger_transaction public.transactions;
  revenue_amount numeric(14, 2);
  cogs_amount numeric(14, 2);
  gross_profit_amount numeric(14, 2);
  new_sale public.sales;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  workspace_id := public.business_workspace_id(target_business_id);

  if workspace_id is null then
    raise exception 'Business not found';
  end if;

  if not public.can_manage_workspace_data(workspace_id) then
    raise exception 'Not allowed to record this sale';
  end if;

  select *
  into target_product
  from public.products
  where id = target_product_id
    and business_id = target_business_id;

  if target_product.id is null then
    raise exception 'Product not found for this business';
  end if;

  if sale_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = payment_account_id
      and workspace_id = workspace_id
      and is_archived = false
  ) then
    raise exception 'Payment account does not belong to this workspace';
  end if;

  revenue_amount := round(sale_selling_price * sale_quantity, 2);
  cogs_amount := round(target_product.cost_per_unit * sale_quantity, 2);
  gross_profit_amount := revenue_amount - cogs_amount;

  insert into public.transactions (
    workspace_id,
    account_id,
    type,
    amount,
    direction,
    transaction_date,
    notes,
    created_by
  )
  values (
    workspace_id,
    payment_account_id,
    'sale_income',
    revenue_amount,
    'in',
    sale_date,
    sale_notes,
    auth.uid()
  )
  returning * into ledger_transaction;

  update public.accounts
  set current_balance = current_balance + revenue_amount
  where id = payment_account_id;

  insert into public.sales (
    business_id,
    product_id,
    transaction_id,
    quantity,
    selling_price,
    cost_per_unit,
    revenue,
    cogs,
    gross_profit,
    sale_date,
    notes,
    created_by
  )
  values (
    target_business_id,
    target_product_id,
    ledger_transaction.id,
    sale_quantity,
    sale_selling_price,
    target_product.cost_per_unit,
    revenue_amount,
    cogs_amount,
    gross_profit_amount,
    sale_date,
    sale_notes,
    auth.uid()
  )
  returning * into new_sale;

  perform public.log_activity(
    workspace_id,
    'created_sale',
    'sale',
    new_sale.id,
    'Recorded a business sale'
  );

  return new_sale;
end;
$$;

create or replace function public.create_business_expense_entry(
  target_business_id uuid,
  payment_account_id uuid,
  target_category_id uuid,
  expense_amount numeric,
  expense_date date,
  expense_notes text default null
)
returns public.business_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  ledger_transaction public.transactions;
  new_expense public.business_expenses;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  workspace_id := public.business_workspace_id(target_business_id);

  if workspace_id is null then
    raise exception 'Business not found';
  end if;

  if not public.can_manage_workspace_data(workspace_id) then
    raise exception 'Not allowed to record this expense';
  end if;

  if expense_amount <= 0 then
    raise exception 'Expense amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = payment_account_id
      and workspace_id = workspace_id
      and is_archived = false
  ) then
    raise exception 'Payment account does not belong to this workspace';
  end if;

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
    workspace_id,
    payment_account_id,
    target_category_id,
    'business_expense',
    expense_amount,
    'out',
    expense_date,
    expense_notes,
    auth.uid()
  )
  returning * into ledger_transaction;

  update public.accounts
  set current_balance = current_balance - expense_amount
  where id = payment_account_id;

  insert into public.business_expenses (
    business_id,
    transaction_id,
    category_id,
    amount,
    expense_date,
    notes,
    created_by
  )
  values (
    target_business_id,
    ledger_transaction.id,
    target_category_id,
    expense_amount,
    expense_date,
    expense_notes,
    auth.uid()
  )
  returning * into new_expense;

  perform public.log_activity(
    workspace_id,
    'created_business_expense',
    'business_expense',
    new_expense.id,
    'Recorded a business expense'
  );

  return new_expense;
end;
$$;

alter table public.activity_logs enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.product_ingredients enable row level security;
alter table public.sales enable row level security;
alter table public.business_expenses enable row level security;

create policy "Workspace peers can read shared profiles"
  on public.profiles for select
  using (public.can_read_profile(id));

create policy "Members can read activity logs"
  on public.activity_logs for select
  using (public.is_workspace_member(workspace_id));

create policy "Members can create activity logs"
  on public.activity_logs for insert
  with check (
    public.is_workspace_member(workspace_id)
    and user_id = auth.uid()
  );

create policy "Members can read recurring transactions"
  on public.recurring_transactions for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners admins and editors can manage recurring transactions"
  on public.recurring_transactions for insert
  with check (
    public.can_manage_workspace_data(workspace_id)
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update recurring transactions"
  on public.recurring_transactions for update
  using (public.can_manage_workspace_data(workspace_id))
  with check (public.can_manage_workspace_data(workspace_id));

create policy "Members can read debts"
  on public.debts for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners admins and editors can create debts"
  on public.debts for insert
  with check (
    public.can_manage_workspace_data(workspace_id)
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update debts"
  on public.debts for update
  using (public.can_manage_workspace_data(workspace_id))
  with check (public.can_manage_workspace_data(workspace_id));

create policy "Members can read debt payments"
  on public.debt_payments for select
  using (public.is_workspace_member(public.debt_workspace_id(debt_id)));

create policy "Owners admins and editors can create debt payments"
  on public.debt_payments for insert
  with check (
    public.can_manage_workspace_data(public.debt_workspace_id(debt_id))
    and created_by = auth.uid()
  );

create policy "Members can read businesses"
  on public.businesses for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners admins and editors can create businesses"
  on public.businesses for insert
  with check (
    public.can_manage_workspace_data(workspace_id)
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update businesses"
  on public.businesses for update
  using (public.can_manage_workspace_data(workspace_id))
  with check (public.can_manage_workspace_data(workspace_id));

create policy "Members can read products"
  on public.products for select
  using (public.is_workspace_member(public.business_workspace_id(business_id)));

create policy "Owners admins and editors can create products"
  on public.products for insert
  with check (
    public.can_manage_workspace_data(public.business_workspace_id(business_id))
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update products"
  on public.products for update
  using (public.can_manage_workspace_data(public.business_workspace_id(business_id)))
  with check (public.can_manage_workspace_data(public.business_workspace_id(business_id)));

create policy "Members can read product ingredients"
  on public.product_ingredients for select
  using (public.is_workspace_member(public.product_workspace_id(product_id)));

create policy "Owners admins and editors can create product ingredients"
  on public.product_ingredients for insert
  with check (public.can_manage_workspace_data(public.product_workspace_id(product_id)));

create policy "Owners admins and editors can update product ingredients"
  on public.product_ingredients for update
  using (public.can_manage_workspace_data(public.product_workspace_id(product_id)))
  with check (public.can_manage_workspace_data(public.product_workspace_id(product_id)));

create policy "Members can read sales"
  on public.sales for select
  using (public.is_workspace_member(public.business_workspace_id(business_id)));

create policy "Owners admins and editors can create sales"
  on public.sales for insert
  with check (
    public.can_manage_workspace_data(public.business_workspace_id(business_id))
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update sales"
  on public.sales for update
  using (public.can_manage_workspace_data(public.business_workspace_id(business_id)))
  with check (public.can_manage_workspace_data(public.business_workspace_id(business_id)));

create policy "Members can read business expenses"
  on public.business_expenses for select
  using (public.is_workspace_member(public.business_workspace_id(business_id)));

create policy "Owners admins and editors can create business expenses"
  on public.business_expenses for insert
  with check (
    public.can_manage_workspace_data(public.business_workspace_id(business_id))
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update business expenses"
  on public.business_expenses for update
  using (public.can_manage_workspace_data(public.business_workspace_id(business_id)))
  with check (public.can_manage_workspace_data(public.business_workspace_id(business_id)));
