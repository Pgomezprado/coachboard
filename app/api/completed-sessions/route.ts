import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  scheduled_id: z.string().uuid(),
  athlete_id: z.string().uuid(),
  duration_min: z.coerce.number().int().positive().optional(),
  athlete_rpe: z.coerce.number().min(1).max(10).optional(),
  athlete_notes: z.string().max(1000).optional(),
  coach_notes: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Upsert — permite actualizar si ya existe
  const { data, error } = await supabase
    .from('completed_sessions')
    .upsert({
      scheduled_id: parsed.data.scheduled_id,
      athlete_id: parsed.data.athlete_id,
      completed_at: new Date().toISOString(),
      duration_min: parsed.data.duration_min ?? null,
      athlete_rpe: parsed.data.athlete_rpe ?? null,
      athlete_notes: parsed.data.athlete_notes ?? null,
      coach_notes: parsed.data.coach_notes ?? null,
    }, { onConflict: 'scheduled_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
