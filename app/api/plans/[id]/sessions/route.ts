import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sessionTemplateSchema, sessionExerciseSchema } from '@/lib/validations/plan'

// POST /api/plans/[id]/sessions — crear sesión template
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()

  // Puede ser una sesión template o un ejercicio dentro de una sesión
  if (body.exercise_id !== undefined) {
    // Es un session_exercise
    const parsed = sessionExerciseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const { data, error } = await supabase
      .from('session_exercises')
      .insert({
        ...parsed.data,
        weight_kg: parsed.data.weight_kg || null,
        reps_min: parsed.data.reps_min || null,
        reps_max: parsed.data.reps_max || null,
        rpe_target: parsed.data.rpe_target || null,
        rest_sec: parsed.data.rest_sec || null,
        notes: parsed.data.notes || null,
        estimated_duration_min: undefined,
      })
      .select('*, exercise:exercise_id(name, category, muscle_groups)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  }

  // Es una session_template
  const parsed = sessionTemplateSchema.safeParse({ ...body, plan_id: planId })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('session_templates')
    .insert({
      ...parsed.data,
      estimated_duration_min: parsed.data.estimated_duration_min || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
