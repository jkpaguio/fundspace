create policy "Users can create their own profile"
  on public.profiles for insert
  with check (id = auth.uid());
