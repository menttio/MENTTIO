-- Nivel B · Fase 4: RLS por usuario + alta automática de perfil al registrarse.
-- La service_role (Worker/funciones) sigue bypasseando RLS. Estas políticas son para el frontend
-- (anon key + JWT del usuario logueado con Supabase Auth).

-- ¿El usuario actual es admin? (lookup en profiles por email)
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where email = auth.email() and role = 'admin');
$$;

-- Al crear un usuario en Supabase Auth, crear su fila en profiles (vinculada por email).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id::text, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (email) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: ids de los teachers cuyo dueño es el usuario actual.
-- (se usa inline en las políticas)

-- ===================== profiles =====================
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (email = auth.email() or public.is_admin());
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated
  using (email = auth.email() or public.is_admin());
create policy "profiles_insert_self" on public.profiles for insert to authenticated
  with check (email = auth.email() or public.is_admin());

-- ===================== subjects (catálogo público) =====================
create policy "subjects_select_all" on public.subjects for select to authenticated using (true);
create policy "subjects_admin_write" on public.subjects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ===================== teachers (perfiles navegables) =====================
create policy "teachers_select_all" on public.teachers for select to authenticated using (true);
create policy "teachers_insert_own_or_admin" on public.teachers for insert to authenticated
  with check (user_email = auth.email() or public.is_admin());
create policy "teachers_update_own_or_admin" on public.teachers for update to authenticated
  using (user_email = auth.email() or public.is_admin());
create policy "teachers_delete_own_or_admin" on public.teachers for delete to authenticated
  using (user_email = auth.email() or public.is_admin());

-- ===================== students (privado: propio, admin, o profesor con clase) =====================
create policy "students_select" on public.students for select to authenticated
  using (
    user_email = auth.email() or public.is_admin()
    or exists (select 1 from public.bookings b
               where b.student_id = students.id and b.teacher_email = auth.email())
  );
create policy "students_insert_own_or_admin" on public.students for insert to authenticated
  with check (user_email = auth.email() or public.is_admin());
create policy "students_update_own_or_admin" on public.students for update to authenticated
  using (user_email = auth.email() or public.is_admin());
create policy "students_delete_own_or_admin" on public.students for delete to authenticated
  using (user_email = auth.email() or public.is_admin());

-- ===================== availability (lectura pública para reservar; escritura del profe dueño) =====================
create policy "availability_select_all" on public.availability for select to authenticated using (true);
create policy "availability_write_owner_or_admin" on public.availability for all to authenticated
  using (public.is_admin() or teacher_id in (select id from public.teachers where user_email = auth.email()))
  with check (public.is_admin() or teacher_id in (select id from public.teachers where user_email = auth.email()));

-- ===================== bookings (participantes) =====================
create policy "bookings_select_participant" on public.bookings for select to authenticated
  using (student_email = auth.email() or teacher_email = auth.email() or public.is_admin());
create policy "bookings_insert_auth" on public.bookings for insert to authenticated
  with check (student_email = auth.email() or teacher_email = auth.email() or public.is_admin());
create policy "bookings_update_participant" on public.bookings for update to authenticated
  using (student_email = auth.email() or teacher_email = auth.email() or public.is_admin());
create policy "bookings_delete_participant" on public.bookings for delete to authenticated
  using (student_email = auth.email() or teacher_email = auth.email() or public.is_admin());

-- ===================== conversations / messages =====================
create policy "conversations_participant" on public.conversations for all to authenticated
  using (student_email = auth.email() or teacher_email = auth.email() or public.is_admin())
  with check (student_email = auth.email() or teacher_email = auth.email() or public.is_admin());
create policy "messages_participant" on public.messages for all to authenticated
  using (public.is_admin() or conversation_id in (
    select id from public.conversations where student_email = auth.email() or teacher_email = auth.email()))
  with check (public.is_admin() or conversation_id in (
    select id from public.conversations where student_email = auth.email() or teacher_email = auth.email()));

-- ===================== notifications (propias) =====================
create policy "notifications_own" on public.notifications for all to authenticated
  using (user_email = auth.email() or public.is_admin())
  with check (user_email = auth.email() or public.is_admin());

-- ===================== reviews (lectura pública; escribe el alumno autor) =====================
create policy "reviews_select_all" on public.reviews for select to authenticated using (true);
create policy "reviews_insert_author" on public.reviews for insert to authenticated
  with check (public.is_admin() or student_id in (select id from public.students where user_email = auth.email()));
create policy "reviews_update_author" on public.reviews for update to authenticated
  using (public.is_admin() or student_id in (select id from public.students where user_email = auth.email()));

-- ===================== push_subscriptions (propias) =====================
create policy "push_own" on public.push_subscriptions for all to authenticated
  using (user_email = auth.email() or public.is_admin())
  with check (user_email = auth.email() or public.is_admin());

-- ===================== trial_used (solo admin; service role bypassa) =====================
create policy "trial_used_admin" on public.trial_used for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
