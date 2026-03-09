import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SessionBuilder } from '@/components/plans/SessionBuilder'
import { AssignPlanModal } from '@/components/plans/AssignPlanModal'
import { PlanForm } from '@/components/plans/PlanForm'
import { PLAN_TYPES } from '@/lib/validations/plan'
import type { Exercise } from '@/types'

const typeLabel = Object.fromEntries(PLAN_TYPES.map((t) => [t.value, t.label]))

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: plan } = await supabase
    .from('training_plans')
    .select(`
      *,
      plan_weeks(
        id, week_number, focus, notes,
        session_templates(
          id, day_of_week, title, estimated_duration_min,
          session_exercises(
            id, sets, reps_min, reps_max, weight_kg, rpe_target, rest_sec, notes, order,
            exercise:exercise_id(id, name, category, muscle_groups)
          )
        )
      )
    `)
    .eq('id', id)
    .eq('coach_id', user!.id)
    .single()

  if (!plan) notFound()

  // Ejercicios disponibles del coach
  const { data: exercises } = await supabase
    .from('exercise_library')
    .select('id, name, category, muscle_groups')
    .or(`coach_id.eq.${user!.id},is_public.eq.true`)
    .order('name')

  // Atletas del coach para asignar
  const { data: athletes } = await supabase
    .from('athlete_profiles')
    .select('user_id, user:user_id(name, email)')
    .eq('coach_id', user!.id)
    .eq('status', 'active')

  const weeks = (plan.plan_weeks as {
    id: string
    week_number: number
    focus: string | null
    notes: string | null
    session_templates: {
      id: string
      day_of_week: number
      title: string
      estimated_duration_min: number | null
      session_exercises: {
        id: string
        sets: number
        reps_min: number | null
        reps_max: number | null
        weight_kg: number | null
        rpe_target: number | null
        rest_sec: number | null
        notes: string | null
        order: number
        exercise: { id: string; name: string; category: string; muscle_groups: string[] } | null
      }[]
    }[]
  }[]).sort((a, b) => a.week_number - b.week_number)

  const weeksForBuilder = weeks.map((w) => ({
    id: w.id,
    week_number: w.week_number,
    focus: w.focus,
    sessions: (w.session_templates ?? [])
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map((s) => ({
        ...s,
        session_exercises: (s.session_exercises ?? []).sort((a, b) => a.order - b.order),
      })),
  }))

  const totalSessions = weeksForBuilder.reduce((acc, w) => acc + w.sessions.length, 0)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/plans" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{plan.name}</h1>
              <Badge
                variant="outline"
                className={`border ${
                  plan.status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-600/20 text-slate-400 border-slate-600/30'
                }`}
              >
                {plan.status === 'published' ? 'Publicado' : 'Borrador'}
              </Badge>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              {typeLabel[plan.type]} · {plan.duration_weeks} semanas · {totalSessions} sesiones
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AssignPlanModal
            planId={id}
            athletes={(athletes ?? []) as unknown as { user_id: string; user: { name: string; email: string } | null }[]}
          />
        </div>
      </div>

      {plan.description && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-slate-300 text-sm">{plan.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit plan basics */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-300 flex items-center gap-2 list-none">
          <Edit className="h-3.5 w-3.5" />
          Editar datos del plan
        </summary>
        <div className="mt-4">
          <PlanForm
            mode="edit"
            planId={id}
            defaultValues={{
              name: plan.name,
              description: plan.description ?? '',
              duration_weeks: plan.duration_weeks,
              type: plan.type,
              status: plan.status,
            }}
          />
        </div>
      </details>

      {/* Session builder */}
      <div>
        <h2 className="text-base font-semibold text-slate-200 mb-3">Constructor de sesiones</h2>
        <SessionBuilder
          planId={id}
          weeks={weeksForBuilder}
          exercises={(exercises ?? []) as Exercise[]}
        />
      </div>
    </div>
  )
}
