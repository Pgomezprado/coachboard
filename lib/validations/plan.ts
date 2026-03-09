import { z } from 'zod'

export const planSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  duration_weeks: z.number().int().min(1).max(52),
  type: z.enum(['strength', 'cardio', 'mixed', 'sport_specific']),
  status: z.enum(['draft', 'published']).default('draft'),
})

export const sessionTemplateSchema = z.object({
  week_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  day_of_week: z.coerce.number().int().min(0).max(6),
  title: z.string().min(2).max(100),
  estimated_duration_min: z.coerce.number().int().min(5).max(300).optional().or(z.literal('')),
})

export const sessionExerciseSchema = z.object({
  session_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  order: z.coerce.number().int().min(0),
  sets: z.coerce.number().int().min(1).max(20),
  reps_min: z.coerce.number().int().min(1).optional().or(z.literal('')),
  reps_max: z.coerce.number().int().min(1).optional().or(z.literal('')),
  weight_kg: z.coerce.number().min(0).optional().or(z.literal('')),
  rpe_target: z.coerce.number().min(1).max(10).optional().or(z.literal('')),
  rest_sec: z.coerce.number().int().min(0).optional().or(z.literal('')),
  notes: z.string().max(300).optional().or(z.literal('')),
})

export const assignPlanSchema = z.object({
  athlete_id: z.string().uuid('Selecciona un atleta'),
  start_date: z.string().min(1, 'La fecha de inicio es requerida'),
  load_modifier_percent: z.number().int().min(10).max(200).default(100),
})

export type PlanFormData = z.infer<typeof planSchema>
export type SessionTemplateFormData = z.infer<typeof sessionTemplateSchema>
export type SessionExerciseFormData = z.infer<typeof sessionExerciseSchema>
export type AssignPlanFormData = z.infer<typeof assignPlanSchema>

export const PLAN_TYPES = [
  { value: 'strength', label: 'Fuerza' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'sport_specific', label: 'Específico de deporte' },
]

export const DAYS_OF_WEEK = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
]
