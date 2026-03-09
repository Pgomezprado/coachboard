import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { planSchema } from '@/lib/validations/plan'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = planSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Crear el plan
  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .insert({ ...parsed.data, coach_id: user.id })
    .select()
    .single()

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  // Crear las semanas automáticamente
  const weeks = Array.from({ length: parsed.data.duration_weeks }, (_, i) => ({
    plan_id: plan.id,
    week_number: i + 1,
    focus: null,
    notes: null,
  }))

  const { data: createdWeeks, error: weeksError } = await supabase
    .from('plan_weeks')
    .insert(weeks)
    .select()

  if (weeksError) return NextResponse.json({ error: weeksError.message }, { status: 500 })

  return NextResponse.json({ data: { ...plan, weeks: createdWeeks } }, { status: 201 })
}
