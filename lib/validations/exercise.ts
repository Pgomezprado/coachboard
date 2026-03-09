import { z } from 'zod'

export const exerciseSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  category: z.enum(['strength', 'cardio', 'flexibility', 'plyometrics', 'sport_specific']),
  muscle_groups: z.array(z.string()).min(1, 'Selecciona al menos un músculo'),
  equipment: z.string().max(100).optional().or(z.literal('')),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instructions: z.string().max(2000).optional().or(z.literal('')),
  is_public: z.boolean().default(false),
})

export type ExerciseFormData = z.infer<typeof exerciseSchema>

export const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Pecho' },
  { value: 'back', label: 'Espalda' },
  { value: 'shoulders', label: 'Hombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'forearms', label: 'Antebrazos' },
  { value: 'core', label: 'Core' },
  { value: 'quads', label: 'Cuádriceps' },
  { value: 'hamstrings', label: 'Isquiotibiales' },
  { value: 'glutes', label: 'Glúteos' },
  { value: 'calves', label: 'Pantorrillas' },
  { value: 'full_body', label: 'Cuerpo completo' },
  { value: 'cardio', label: 'Cardio' },
]

export const CATEGORIES = [
  { value: 'strength', label: 'Fuerza' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibilidad' },
  { value: 'plyometrics', label: 'Pliometría' },
  { value: 'sport_specific', label: 'Específico de deporte' },
]
