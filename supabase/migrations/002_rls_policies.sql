-- ============================================================
-- CoachBoard — Migración 002: Row Level Security (RLS)
-- ============================================================
-- Habilitar RLS en todas las tablas públicas

alter table public.users enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.athlete_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.exercise_library enable row level security;
alter table public.training_plans enable row level security;
alter table public.plan_weeks enable row level security;
alter table public.session_templates enable row level security;
alter table public.session_exercises enable row level security;
alter table public.athlete_plans enable row level security;
alter table public.scheduled_sessions enable row level security;
alter table public.completed_sessions enable row level security;
alter table public.completed_sets enable row level security;
alter table public.attendance enable row level security;
alter table public.body_metrics enable row level security;
alter table public.performance_metrics enable row level security;

-- ─── Helper: obtener rol del usuario actual ───────────────────
create or replace function public.get_my_role()
returns user_role as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer stable;

-- ─── Helper: verificar si el usuario actual es coach ─────────
create or replace function public.is_coach()
returns boolean as $$
  select role in ('coach_admin', 'coach_assistant')
  from public.users where id = auth.uid();
$$ language sql security definer stable;

-- ─── Helper: verificar si el atleta pertenece al coach ───────
create or replace function public.athlete_belongs_to_coach(athlete_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.athlete_profiles
    where user_id = athlete_user_id
    and coach_id = auth.uid()
  );
$$ language sql security definer stable;

-- ============================================================
-- POLÍTICAS: users
-- ============================================================

-- Ver perfil propio siempre
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

-- Coaches pueden ver sus atletas
create policy "coaches_select_their_athletes" on public.users
  for select using (
    public.is_coach() and
    exists (
      select 1 from public.athlete_profiles
      where user_id = users.id and coach_id = auth.uid()
    )
  );

-- Actualizar solo perfil propio
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- ============================================================
-- POLÍTICAS: coach_profiles
-- ============================================================

create policy "coaches_select_own_profile" on public.coach_profiles
  for select using (user_id = auth.uid());

create policy "coaches_update_own_profile" on public.coach_profiles
  for update using (user_id = auth.uid());

-- ============================================================
-- POLÍTICAS: athlete_profiles
-- ============================================================

-- El atleta ve su propio perfil
create policy "athletes_select_own_profile" on public.athlete_profiles
  for select using (user_id = auth.uid());

-- El coach ve los perfiles de sus atletas
create policy "coaches_select_their_athletes_profiles" on public.athlete_profiles
  for select using (coach_id = auth.uid());

-- Solo coach_admin puede crear/editar/eliminar perfiles de atletas
create policy "coaches_insert_athlete_profile" on public.athlete_profiles
  for insert with check (public.get_my_role() = 'coach_admin');

create policy "coaches_update_athlete_profile" on public.athlete_profiles
  for update using (coach_id = auth.uid() and public.is_coach());

create policy "coaches_delete_athlete_profile" on public.athlete_profiles
  for delete using (coach_id = auth.uid() and public.get_my_role() = 'coach_admin');

-- ============================================================
-- POLÍTICAS: teams
-- ============================================================

create policy "coaches_manage_own_teams" on public.teams
  for all using (coach_id = auth.uid());

-- Atletas pueden ver equipos a los que pertenecen
create policy "athletes_view_their_teams" on public.teams
  for select using (
    exists (
      select 1 from public.team_members tm
      join public.athlete_profiles ap on ap.id = tm.athlete_id
      where tm.team_id = teams.id and ap.user_id = auth.uid()
    )
  );

-- ============================================================
-- POLÍTICAS: exercise_library
-- ============================================================

-- Coaches ven su propia biblioteca + ejercicios públicos
create policy "coaches_select_exercises" on public.exercise_library
  for select using (
    coach_id = auth.uid() or is_public = true
  );

-- Atletas ven ejercicios públicos y los de su coach
create policy "athletes_select_exercises" on public.exercise_library
  for select using (
    is_public = true or
    exists (
      select 1 from public.athlete_profiles ap
      where ap.user_id = auth.uid() and ap.coach_id = exercise_library.coach_id
    )
  );

-- Solo coaches pueden gestionar ejercicios
create policy "coaches_manage_exercises" on public.exercise_library
  for insert with check (coach_id = auth.uid() and public.is_coach());

create policy "coaches_update_exercises" on public.exercise_library
  for update using (coach_id = auth.uid() and public.is_coach());

create policy "coaches_delete_exercises" on public.exercise_library
  for delete using (coach_id = auth.uid() and public.get_my_role() = 'coach_admin');

-- ============================================================
-- POLÍTICAS: training_plans
-- ============================================================

create policy "coaches_manage_own_plans" on public.training_plans
  for all using (coach_id = auth.uid() and public.is_coach());

-- Atletas ven planes que tienen asignados
create policy "athletes_view_assigned_plans" on public.training_plans
  for select using (
    exists (
      select 1 from public.athlete_plans ap
      where ap.plan_id = training_plans.id and ap.athlete_id = auth.uid()
    )
  );

-- ============================================================
-- POLÍTICAS: plan_weeks y session_templates
-- ============================================================

create policy "coaches_manage_plan_weeks" on public.plan_weeks
  for all using (
    exists (
      select 1 from public.training_plans tp
      where tp.id = plan_weeks.plan_id and tp.coach_id = auth.uid()
    )
  );

create policy "athletes_view_plan_weeks" on public.plan_weeks
  for select using (
    exists (
      select 1 from public.training_plans tp
      join public.athlete_plans ap on ap.plan_id = tp.id
      where tp.id = plan_weeks.plan_id and ap.athlete_id = auth.uid()
    )
  );

create policy "coaches_manage_session_templates" on public.session_templates
  for all using (
    exists (
      select 1 from public.training_plans tp
      where tp.id = session_templates.plan_id and tp.coach_id = auth.uid()
    )
  );

create policy "athletes_view_session_templates" on public.session_templates
  for select using (
    exists (
      select 1 from public.training_plans tp
      join public.athlete_plans ap on ap.plan_id = tp.id
      where tp.id = session_templates.plan_id and ap.athlete_id = auth.uid()
    )
  );

-- ============================================================
-- POLÍTICAS: session_exercises
-- ============================================================

create policy "coaches_manage_session_exercises" on public.session_exercises
  for all using (
    exists (
      select 1 from public.session_templates st
      join public.training_plans tp on tp.id = st.plan_id
      where st.id = session_exercises.session_id and tp.coach_id = auth.uid()
    )
  );

create policy "athletes_view_session_exercises" on public.session_exercises
  for select using (
    exists (
      select 1 from public.session_templates st
      join public.training_plans tp on tp.id = st.plan_id
      join public.athlete_plans ap on ap.plan_id = tp.id
      where st.id = session_exercises.session_id and ap.athlete_id = auth.uid()
    )
  );

-- ============================================================
-- POLÍTICAS: athlete_plans
-- ============================================================

create policy "coaches_manage_athlete_plans" on public.athlete_plans
  for all using (
    public.is_coach() and
    exists (
      select 1 from public.training_plans tp
      where tp.id = athlete_plans.plan_id and tp.coach_id = auth.uid()
    )
  );

create policy "athletes_view_own_plans" on public.athlete_plans
  for select using (athlete_id = auth.uid());

-- ============================================================
-- POLÍTICAS: scheduled_sessions
-- ============================================================

create policy "coaches_view_scheduled_sessions" on public.scheduled_sessions
  for select using (
    exists (
      select 1 from public.athlete_plans ap
      join public.training_plans tp on tp.id = ap.plan_id
      where ap.id = scheduled_sessions.athlete_plan_id and tp.coach_id = auth.uid()
    )
  );

create policy "coaches_update_scheduled_sessions" on public.scheduled_sessions
  for update using (
    public.is_coach() and
    exists (
      select 1 from public.athlete_plans ap
      join public.training_plans tp on tp.id = ap.plan_id
      where ap.id = scheduled_sessions.athlete_plan_id and tp.coach_id = auth.uid()
    )
  );

create policy "athletes_view_own_scheduled_sessions" on public.scheduled_sessions
  for select using (
    exists (
      select 1 from public.athlete_plans ap
      where ap.id = scheduled_sessions.athlete_plan_id and ap.athlete_id = auth.uid()
    )
  );

-- ============================================================
-- POLÍTICAS: completed_sessions
-- ============================================================

create policy "coaches_view_completed_sessions" on public.completed_sessions
  for select using (
    public.athlete_belongs_to_coach(athlete_id) or
    public.is_coach()
  );

create policy "coaches_update_completed_sessions" on public.completed_sessions
  for update using (
    public.is_coach() and public.athlete_belongs_to_coach(athlete_id)
  );

create policy "athletes_manage_own_completed_sessions" on public.completed_sessions
  for all using (athlete_id = auth.uid());

-- ============================================================
-- POLÍTICAS: completed_sets
-- ============================================================

create policy "coaches_view_completed_sets" on public.completed_sets
  for select using (
    exists (
      select 1 from public.completed_sessions cs
      where cs.id = completed_sets.completed_session_id
      and public.athlete_belongs_to_coach(cs.athlete_id)
    )
  );

create policy "athletes_manage_own_completed_sets" on public.completed_sets
  for all using (
    exists (
      select 1 from public.completed_sessions cs
      where cs.id = completed_sets.completed_session_id
      and cs.athlete_id = auth.uid()
    )
  );

-- ============================================================
-- POLÍTICAS: body_metrics
-- ============================================================

create policy "athletes_manage_own_body_metrics" on public.body_metrics
  for all using (athlete_id = auth.uid());

create policy "coaches_view_athletes_body_metrics" on public.body_metrics
  for select using (public.athlete_belongs_to_coach(athlete_id));

-- ============================================================
-- POLÍTICAS: performance_metrics
-- ============================================================

create policy "athletes_manage_own_performance_metrics" on public.performance_metrics
  for all using (athlete_id = auth.uid());

create policy "coaches_view_athletes_performance_metrics" on public.performance_metrics
  for select using (public.athlete_belongs_to_coach(athlete_id));
