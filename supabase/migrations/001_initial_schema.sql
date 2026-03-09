-- ============================================================
-- CoachBoard — Migración 001: Schema Inicial
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Tipos ENUM ───────────────────────────────────────────────
create type user_role as enum ('coach_admin', 'coach_assistant', 'athlete');
create type athlete_status as enum ('active', 'injured', 'recovering', 'inactive');
create type subscription_tier as enum ('free', 'pro', 'team');
create type plan_type as enum ('strength', 'cardio', 'mixed', 'sport_specific');
create type plan_status as enum ('draft', 'published');
create type session_status as enum ('planned', 'done', 'cancelled', 'modified');
create type attendance_status as enum ('present', 'absent', 'late');
create type metric_type as enum ('1rm', 'time', 'distance');
create type exercise_category as enum ('strength', 'cardio', 'flexibility', 'plyometrics', 'sport_specific');

-- ============================================================
-- TABLAS DE USUARIOS Y PERFILES
-- ============================================================

-- Tabla principal de usuarios (extiende auth.users de Supabase)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null unique,
  name text not null,
  avatar_url text,
  role user_role not null default 'athlete',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfil extendido del entrenador
create table public.coach_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade unique not null,
  bio text,
  specialties text[] default '{}',
  timezone text not null default 'UTC',
  subscription_tier subscription_tier not null default 'free',
  created_at timestamptz not null default now()
);

-- Perfil extendido del atleta
create table public.athlete_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade unique not null,
  coach_id uuid references public.users(id) on delete set null,
  sport text,
  position text,
  birth_date date,
  status athlete_status not null default 'active',
  notes_private text, -- Solo visible para el entrenador
  created_at timestamptz not null default now()
);

-- Equipos / Grupos
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  sport text,
  description text,
  created_at timestamptz not null default now()
);

-- Miembros de equipos
create table public.team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade not null,
  athlete_id uuid references public.users(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  role_in_team text,
  unique(team_id, athlete_id)
);

-- ============================================================
-- TABLAS DE PLANIFICACIÓN
-- ============================================================

-- Biblioteca de ejercicios
create table public.exercise_library (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  category exercise_category not null,
  muscle_groups text[] default '{}',
  equipment text,
  video_url text,
  instructions text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- Planes de entrenamiento
create table public.training_plans (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  description text,
  duration_weeks integer not null default 4,
  type plan_type not null default 'mixed',
  status plan_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Semanas de un plan
create table public.plan_weeks (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references public.training_plans(id) on delete cascade not null,
  week_number integer not null,
  focus text,
  notes text,
  unique(plan_id, week_number)
);

-- Plantillas de sesiones (por día de la semana dentro de una semana del plan)
create table public.session_templates (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references public.training_plans(id) on delete cascade not null,
  week_id uuid references public.plan_weeks(id) on delete cascade not null,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=Lunes
  title text not null,
  estimated_duration_min integer,
  created_at timestamptz not null default now()
);

-- Ejercicios dentro de una sesión plantilla
create table public.session_exercises (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.session_templates(id) on delete cascade not null,
  exercise_id uuid references public.exercise_library(id) on delete restrict not null,
  "order" integer not null default 0,
  sets integer not null default 3,
  reps_min integer,
  reps_max integer,
  weight_kg numeric(6,2),
  rpe_target numeric(3,1),
  rest_sec integer,
  notes text
);

-- Asignación de planes a atletas
create table public.athlete_plans (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references public.training_plans(id) on delete cascade not null,
  athlete_id uuid references public.users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  load_modifier_percent integer not null default 100 check (load_modifier_percent between 10 and 200),
  created_at timestamptz not null default now(),
  unique(plan_id, athlete_id)
);

-- ============================================================
-- TABLAS DE EJECUCIÓN Y SEGUIMIENTO
-- ============================================================

-- Sesiones programadas (generadas automáticamente al asignar un plan)
create table public.scheduled_sessions (
  id uuid primary key default uuid_generate_v4(),
  athlete_plan_id uuid references public.athlete_plans(id) on delete cascade not null,
  template_id uuid references public.session_templates(id) on delete cascade not null,
  scheduled_date date not null,
  status session_status not null default 'planned',
  created_at timestamptz not null default now()
);

-- Sesiones completadas (registro de ejecución real)
create table public.completed_sessions (
  id uuid primary key default uuid_generate_v4(),
  scheduled_id uuid references public.scheduled_sessions(id) on delete cascade unique not null,
  athlete_id uuid references public.users(id) on delete cascade not null,
  completed_at timestamptz not null default now(),
  duration_min integer,
  athlete_rpe numeric(3,1),
  coach_notes text,
  athlete_notes text
);

-- Sets completados dentro de una sesión
create table public.completed_sets (
  id uuid primary key default uuid_generate_v4(),
  completed_session_id uuid references public.completed_sessions(id) on delete cascade not null,
  exercise_id uuid references public.exercise_library(id) on delete restrict not null,
  set_number integer not null,
  reps_done integer,
  weight_kg numeric(6,2),
  rpe_actual numeric(3,1)
);

-- Control de asistencia (para clases grupales)
create table public.attendance (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.scheduled_sessions(id) on delete cascade not null,
  athlete_id uuid references public.users(id) on delete cascade not null,
  status attendance_status not null default 'present',
  marked_at timestamptz not null default now(),
  unique(session_id, athlete_id)
);

-- ============================================================
-- TABLAS DE MÉTRICAS
-- ============================================================

-- Métricas corporales
create table public.body_metrics (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references public.users(id) on delete cascade not null,
  measured_at date not null default current_date,
  weight_kg numeric(5,2),
  body_fat_percent numeric(4,1),
  muscle_mass_kg numeric(5,2),
  height_cm numeric(5,1),
  notes text,
  created_at timestamptz not null default now()
);

-- Métricas de rendimiento (1RM, tiempos, distancias)
create table public.performance_metrics (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid references public.users(id) on delete cascade not null,
  exercise_id uuid references public.exercise_library(id) on delete cascade not null,
  measured_at date not null default current_date,
  value numeric(8,2) not null,
  metric_type metric_type not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================

create index idx_users_role on public.users(role);
create index idx_athlete_profiles_coach_id on public.athlete_profiles(coach_id);
create index idx_athlete_profiles_status on public.athlete_profiles(status);
create index idx_training_plans_coach_id on public.training_plans(coach_id);
create index idx_athlete_plans_athlete_id on public.athlete_plans(athlete_id);
create index idx_scheduled_sessions_date on public.scheduled_sessions(scheduled_date);
create index idx_scheduled_sessions_status on public.scheduled_sessions(status);
create index idx_completed_sessions_athlete_id on public.completed_sessions(athlete_id);
create index idx_body_metrics_athlete_id on public.body_metrics(athlete_id);
create index idx_body_metrics_date on public.body_metrics(measured_at);
create index idx_performance_metrics_athlete_id on public.performance_metrics(athlete_id);

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_training_plans_updated_at
  before update on public.training_plans
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role_val user_role;
begin
  -- El rol viene del raw_user_meta_data pasado al crear el usuario
  user_role_val := coalesce(
    (new.raw_user_meta_data->>'role')::user_role,
    'athlete'
  );

  insert into public.users (id, email, name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    user_role_val
  )
  on conflict (email) do update set
    id = excluded.id,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    role = excluded.role;

  -- Crear perfil específico según el rol
  if user_role_val in ('coach_admin', 'coach_assistant') then
    insert into public.coach_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  else
    insert into public.athlete_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
