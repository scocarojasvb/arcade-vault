-- games: solo lectura pública, sin escritura desde anon/authenticated
alter table games enable row level security;

create policy "games_select_public"
  on games for select
  to anon, authenticated
  using (true);

-- scores: lectura pública, insert solo autenticado y solo el propio user_id
alter table scores enable row level security;

create policy "scores_select_public"
  on scores for select
  to anon, authenticated
  using (true);

create policy "scores_insert_own"
  on scores for insert
  to authenticated
  with check (user_id = auth.uid());

-- cierra el warning del advisor sin tocar la función ni el event trigger ensure_rls
revoke execute on function public.rls_auto_enable() from anon, authenticated;
