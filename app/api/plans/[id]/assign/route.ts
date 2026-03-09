import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assignPlanSchema } from '@/lib/validations/plan'
import { addDays, format } from 'date-fns'

// POST /api/plans/[id]/assign — asignar plan a un atleta
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = assignPlanSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { athlete_id, start_date, load_modifier_percent } = parsed.data

  // Obtener el plan con sus semanas y sesiones
  const { data: plan, error: planError } = await supabase
    .from('training_plans')
    .select(`
      id, duration_weeks,
      plan_weeks(id, week_number,
        session_templates(id, day_of_week)
      )
    `)
    .eq('id', planId)
    .eq('coach_id', user.id)
    .single()

  if (planError || !plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const startDate = new Date(start_date)
  const endDate = addDays(startDate, plan.duration_weeks * 7 - 1)

  // Crear el athlete_plan
  const { data: athletePlan, error: apError } = await supabase
    .from('athlete_plans')
    .insert({
      plan_id: planId,
      athlete_id,
      start_date,
      end_date: format(endDate, 'yyyy-MM-dd'),
      load_modifier_percent,
    })
    .select()
    .single()

  if (apError) {
    if (apError.code === '23505') {
      return NextResponse.json({ error: 'Este atleta ya tiene este plan asignado' }, { status: 409 })
    }
    return NextResponse.json({ error: apError.message }, { status: 500 })
  }

  // Generar scheduled_sessions por cada sesión plantilla de cada semana
  const weeks = (plan.plan_weeks as { id: string; week_number: number; session_templates: { id: string; day_of_week: number }[] }[])
  const scheduledSessions: { athlete_plan_id: string; template_id: string; scheduled_date: string; status: 'planned' }[] = []

  for (const week of weeks) {
    for (const session of week.session_templates) {
      // day_of_week: 0=Lunes, la semana empieza en start_date (que debe ser lunes)
      const sessionDate = addDays(startDate, (week.week_number - 1) * 7 + session.day_of_week)
      scheduledSessions.push({
        athlete_plan_id: athletePlan.id,
        template_id: session.id,
        scheduled_date: format(sessionDate, 'yyyy-MM-dd'),
        status: 'planned',
      })
    }
  }

  if (scheduledSessions.length > 0) {
    const { error: ssError } = await supabase
      .from('scheduled_sessions')
      .insert(scheduledSessions)

    if (ssError) return NextResponse.json({ error: ssError.message }, { status: 500 })
  }

  return NextResponse.json(
    { data: athletePlan, sessions_created: scheduledSessions.length },
    { status: 201 }
  )
}
