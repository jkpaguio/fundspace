create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_currency text not null default 'PHP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'personal'
    check (type in ('personal', 'family', 'business', 'side_hustle', 'other')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null default 'PHP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null default 'cash'
    check (type in ('cash', 'bank', 'wallet', 'savings', 'investment', 'business', 'other')),
  starting_balance numeric(14, 2) not null default 0,
  current_balance numeric(14, 2) not null default 0,
  currency text not null default 'PHP',
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'business_expense')),
  icon text,
  color text,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_global_default_unique
  on public.categories (name, type)
  where workspace_id is null and is_default = true;

create index if not exists workspace_members_lookup
  on public.workspace_members (workspace_id, user_id, status);

create index if not exists accounts_workspace_lookup
  on public.accounts (workspace_id, is_archived);

create index if not exists categories_workspace_lookup
  on public.categories (workspace_id, is_archived);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger workspace_members_set_updated_at
  before update on public.workspace_members
  for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function public.workspace_role(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = target_workspace_id
    and wm.user_id = auth.uid()
    and wm.status = 'active'
  limit 1;
$$;

create or replace function public.can_manage_workspace_data(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.workspace_role(target_workspace_id), '') in ('owner', 'admin', 'editor');
$$;

create or replace function public.can_manage_workspace_members(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.workspace_role(target_workspace_id), '') in ('owner', 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;

create policy "Profiles are readable by the profile owner"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Workspace members can read workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "Users can create owned workspaces"
  on public.workspaces for insert
  with check (owner_id = auth.uid());

create policy "Owners and admins can update workspaces"
  on public.workspaces for update
  using (public.can_manage_workspace_members(id))
  with check (public.can_manage_workspace_members(id));

create policy "Members can read memberships in their workspaces"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners and admins can manage members"
  on public.workspace_members for insert
  with check (public.can_manage_workspace_members(workspace_id));

create policy "Owners and admins can update members"
  on public.workspace_members for update
  using (public.can_manage_workspace_members(workspace_id))
  with check (public.can_manage_workspace_members(workspace_id));

create policy "Members can read accounts"
  on public.accounts for select
  using (public.is_workspace_member(workspace_id));

create policy "Owners admins and editors can create accounts"
  on public.accounts for insert
  with check (
    public.can_manage_workspace_data(workspace_id)
    and created_by = auth.uid()
  );

create policy "Owners admins and editors can update accounts"
  on public.accounts for update
  using (public.can_manage_workspace_data(workspace_id))
  with check (public.can_manage_workspace_data(workspace_id));

create policy "Members can read default or workspace categories"
  on public.categories for select
  using (
    workspace_id is null
    or public.is_workspace_member(workspace_id)
  );

create policy "Owners admins and editors can create categories"
  on public.categories for insert
  with check (
    workspace_id is not null
    and public.can_manage_workspace_data(workspace_id)
  );

create policy "Owners admins and editors can update categories"
  on public.categories for update
  using (
    workspace_id is not null
    and public.can_manage_workspace_data(workspace_id)
  )
  with check (
    workspace_id is not null
    and public.can_manage_workspace_data(workspace_id)
  );

insert into public.categories (name, type, icon, color, is_default)
values
  ('Salary', 'income', 'briefcase', '#2f855a', true),
  ('Freelance', 'income', 'laptop', '#2563eb', true),
  ('Business Income', 'income', 'store', '#0f766e', true),
  ('Allowance', 'income', 'wallet', '#7c3aed', true),
  ('Investment Income', 'income', 'trending-up', '#15803d', true),
  ('Other Income', 'income', 'circle-dollar-sign', '#64748b', true),
  ('Food', 'expense', 'utensils', '#dc2626', true),
  ('Transportation', 'expense', 'car', '#ea580c', true),
  ('Bills', 'expense', 'receipt-text', '#ca8a04', true),
  ('Rent', 'expense', 'home', '#9333ea', true),
  ('Shopping', 'expense', 'shopping-bag', '#db2777', true),
  ('School', 'expense', 'graduation-cap', '#2563eb', true),
  ('Medical', 'expense', 'heart-pulse', '#be123c', true),
  ('Entertainment', 'expense', 'gamepad-2', '#7c3aed', true),
  ('Debt Payment', 'expense', 'credit-card', '#475569', true),
  ('Other Expense', 'expense', 'ellipsis', '#64748b', true),
  ('Supplies', 'business_expense', 'package', '#0f766e', true),
  ('Marketing', 'business_expense', 'megaphone', '#c2410c', true),
  ('Delivery', 'business_expense', 'truck', '#0369a1', true),
  ('Labor', 'business_expense', 'users', '#4f46e5', true),
  ('Equipment', 'business_expense', 'wrench', '#525252', true)
on conflict do nothing;

create or replace function public.create_workspace_with_owner(
  workspace_name text,
  workspace_type text default 'personal',
  workspace_currency text default 'PHP'
)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id)
  values (auth.uid())
  on conflict (id) do nothing;

  insert into public.workspaces (name, type, owner_id, currency)
  values (workspace_name, workspace_type, auth.uid(), workspace_currency)
  returning * into new_workspace;

  insert into public.workspace_members (workspace_id, user_id, role, status, invited_by)
  values (new_workspace.id, auth.uid(), 'owner', 'active', auth.uid());

  return new_workspace;
end;
$$;
