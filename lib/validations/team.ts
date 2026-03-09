import { z } from 'zod'

export const teamSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  sport: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
})

export type TeamFormData = z.infer<typeof teamSchema>
