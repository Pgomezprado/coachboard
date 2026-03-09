import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const setSchema = z.object({
  completed_session_id: z.string().uuid(),
  exercise_id: z.string().uuid(),
  set_number: z.number().int().min(1),
  reps_done: z.number().int().min(0).nullable().optional(),
  weight_kg: z.number().min(0).nullable().optional(),
  rpe_actual: z.number().min(1).max(10).nullable().optional(),
})

const schema = z.object({
  sets: z.array(setSchema).min(1),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Eliminar sets anteriores si ya existían y re-insertar
  const completedSessionId = parsed.data.sets[0].completed_session_id
  await supabase
    .from('completed_sets')
    .delete()
    .eq('completed_session_id', completedSessionId)

  const { data, error } = await supabase
    .from('completed_sets')
    .insert(parsed.data.sets)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
