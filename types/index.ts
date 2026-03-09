// ─── User & Auth Types ───────────────────────────────────────────────────────

export type UserRole = 'coach_admin' | 'coach_assistant' | 'athlete'

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export interface CoachProfile {
  id: string
  user_id: string
  bio: string | null
  specialties: string[]
  timezone: string
  subscription_tier: 'free' | 'pro' | 'team'
}

export interface AthleteProfile {
  id: string
  user_id: string
  coach_id: string
  sport: string | null
  position: string | null
  birth_date: string | null
  status: 'active' | 'injured' | 'recovering' | 'inactive'
}

// ─── Team Types ───────────────────────────────────────────────────────────────

export interface Team {
  id: string
  coach_id: string
  name: string
  sport: string | null
  description: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  athlete_id: string
  joined_at: string
  role_in_team: string | null
}

// ─── Exercise & Plan Types ────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'forearms' | 'core' | 'quads' | 'hamstrings' | 'glutes'
  | 'calves' | 'full_body' | 'cardio'

export type ExerciseCategory =
  | 'strength' | 'cardio' | 'flexibility' | 'plyometrics' | 'sport_specific'

export interface Exercise {
  id: string
  coach_id: string
  name: string
  category: ExerciseCategory
  muscle_groups: MuscleGroup[]
  equipment: string | null
  video_url: string | null
  instructions: string | null
  is_public: boolean
  created_at: string
}

export type PlanType = 'strength' | 'cardio' | 'mixed' | 'sport_specific'

export interface TrainingPlan {
  id: string
  coach_id: string
  name: string
  description: string | null
  duration_weeks: number
  type: PlanType
  status: 'draft' | 'published'
  created_at: string
}

export interface PlanWeek {
  id: string
  plan_id: string
  week_number: number
  focus: string | null
  notes: string | null
}

export interface SessionTemplate {
  id: string
  plan_id: string
  week_id: string
  day_of_week: number // 0=Monday ... 6=Sunday
  title: string
  estimated_duration_min: number | null
}

export interface SessionExercise {
  id: string
  session_id: string
  exercise_id: string
  order: number
  sets: number
  reps_min: number | null
  reps_max: number | null
  weight_kg: number | null
  rpe_target: number | null
  rest_sec: number | null
  notes: string | null
  exercise?: Exercise
}

export interface AthletePlan {
  id: string
  plan_id: string
  athlete_id: string
  start_date: string
  end_date: string
  load_modifier_percent: number
}

// ─── Session Execution Types ──────────────────────────────────────────────────

export type SessionStatus = 'planned' | 'done' | 'cancelled' | 'modified'

export interface ScheduledSession {
  id: string
  athlete_plan_id: string
  template_id: string
  scheduled_date: string
  status: SessionStatus
}

export interface CompletedSession {
  id: string
  scheduled_id: string
  athlete_id: string
  completed_at: string
  duration_min: number | null
  athlete_rpe: number | null
  coach_notes: string | null
  athlete_notes: string | null
}

export interface CompletedSet {
  id: string
  completed_session_id: string
  exercise_id: string
  set_number: number
  reps_done: number | null
  weight_kg: number | null
  rpe_actual: number | null
}

export interface Attendance {
  id: string
  session_id: string
  athlete_id: string
  status: 'present' | 'absent' | 'late'
  marked_at: string
}

// ─── Metrics Types ────────────────────────────────────────────────────────────

export interface BodyMetric {
  id: string
  athlete_id: string
  measured_at: string
  weight_kg: number | null
  body_fat_percent: number | null
  muscle_mass_kg: number | null
  height_cm: number | null
  notes: string | null
}

export interface PerformanceMetric {
  id: string
  athlete_id: string
  exercise_id: string
  measured_at: string
  value: number
  metric_type: '1rm' | 'time' | 'distance'
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface CoachDashboardStats {
  active_athletes: number
  sessions_this_week: number
  global_adherence_percent: number
  pending_sessions_today: number
}

export interface AthleteDashboardStats {
  plan_name: string | null
  sessions_this_week_done: number
  sessions_this_week_total: number
  next_session_date: string | null
  adherence_percent: number
}
