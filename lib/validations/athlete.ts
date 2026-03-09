import { z } from 'zod'

export const athleteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(60),
  email: z.string().email('Email inválido'),
  sport: z.string().max(50).optional().or(z.literal('')),
  position: z.string().max(50).optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'injured', 'recovering', 'inactive']),
  notes_private: z.string().max(1000).optional().or(z.literal('')),
})

export const bodyMetricSchema = z.object({
  measured_at: z.string().min(1, 'La fecha es requerida'),
  weight_kg: z.coerce.number().positive('Debe ser positivo').optional().or(z.literal('')),
  body_fat_percent: z.coerce.number().min(1).max(60).optional().or(z.literal('')),
  muscle_mass_kg: z.coerce.number().positive().optional().or(z.literal('')),
  height_cm: z.coerce.number().positive().optional().or(z.literal('')),
  notes: z.string().max(300).optional().or(z.literal('')),
})

export type AthleteFormData = z.infer<typeof athleteSchema>
export type BodyMetricFormData = z.infer<typeof bodyMetricSchema>
