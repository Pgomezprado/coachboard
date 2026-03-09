import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SessionRegistrationForm } from '@/components/plans/SessionRegistrationForm'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Sesión programada con todos sus datos
  const { data: session } = await supabase
    .from('scheduled_sessions')
    .select(`
      id, scheduled_date, status,
      athlete_plans!inner(
        athlete_id, load_modifier_percent,
        athlete:athlete_id(name, email),
        training_plans!inner(coach_id, name)
      ),
      session_templates(
        id, title, estimated_duration_min,
        session_exercises(
          id, sets, reps_min, reps_max, weight_kg, rpe_target, rest_sec, notes, order,
          exercise:exercise_id(id, name, category)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (!session) notFound()

  const athletePlan = session.athlete_plans as unknown as {
    athlete_id: string
    load_modifier_percent: number
    athlete: { name: string; email: string } | null
    training_plans: { coach_id: string; name: string } | null
  } | null

  // Verificar acceso (coach del plan o el mismo atleta)
  const isCoach = athletePlan?.training_plans?.coach_id === user!.id
  const isAthlete = athletePlan?.athlete_id === user!.id
  if (!isCoach && !isAthlete) notFound()

  const template = session.session_templates as unknown as {
    id: string
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
      exercise: { id: string; name: string; category: string } | null
    }[]
  } | null

  const exercises = (template?.session_exercises ?? []).sort((a, b) => a.order - b.order)
  const loadModifier = athletePlan?.load_modifier_percent ?? 100

  // ¿Ya hay una sesión completada?
  const { data: completedSession } = await supabase
    .from('completed_sessions')
    .select('*, completed_sets(*)')
    .eq('scheduled_id', id)
    .single()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/calendar" className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{template?.title ?? 'Sesión'}</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {new Date(session.scheduled_date).toLocaleDateString('es-ES', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
            {' · '}{athletePlan?.athlete?.name}
            {template?.estimated_duration_min && ` · ${template.estimated_duration_min} min`}
          </p>
        </div>
      </div>

      {/* Ejercicios planificados */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-200 text-base">
            Ejercicios planificados
            {loadModifier !== 100 && (
              <span className="text-slate-500 font-normal text-sm ml-2">
                (carga al {loadModifier}%)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exercises.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              Esta sesión no tiene ejercicios asignados.
            </p>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex, idx) => {
                const adjustedWeight = ex.weight_kg
                  ? Math.round((ex.weight_kg * loadModifier) / 100 * 10) / 10
                  : null
                return (
                  <div key={ex.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                    <span className="text-slate-600 text-xs w-5 text-center">{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-slate-100 text-sm font-medium">
                        {ex.exercise?.name ?? 'Ejercicio'}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {ex.sets} series ×{' '}
                        {ex.reps_min ?? '?'}
                        {ex.reps_max && ex.reps_max !== ex.reps_min ? `-${ex.reps_max}` : ''} reps
                        {adjustedWeight ? ` @ ${adjustedWeight}kg` : ''}
                        {ex.rpe_target ? ` · RPE ${ex.rpe_target}` : ''}
                        {ex.rest_sec ? ` · ${ex.rest_sec}s descanso` : ''}
                      </p>
                      {ex.notes && (
                        <p className="text-slate-500 text-xs mt-0.5 italic">{ex.notes}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registro de ejecución */}
      <SessionRegistrationForm
        scheduledSessionId={id}
        athleteId={athletePlan?.athlete_id ?? ''}
        exercises={exercises.map((ex) => ({
          id: ex.id,
          exerciseId: ex.exercise?.id ?? '',
          name: ex.exercise?.name ?? 'Ejercicio',
          sets: ex.sets,
          repsMin: ex.reps_min,
          repsMax: ex.reps_max,
          weightKg: ex.weight_kg,
          rpeTarget: ex.rpe_target,
          loadModifier,
        }))}
        currentStatus={session.status as 'planned' | 'done' | 'cancelled' | 'modified'}
        completedSession={completedSession}
      />
    </div>
  )
}
