import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Dumbbell, Calendar, TrendingUp, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BodyMetricForm } from '@/components/athletes/BodyMetricForm'
import WeightEvolutionChart from '@/components/charts/WeightEvolutionChart'
import WeeklyLoadChart from '@/components/charts/WeeklyLoadChart'
import AdherenceChart from '@/components/charts/AdherenceChart'
import OneRMChart from '@/components/charts/OneRMChart'
import { estimateOneRM } from '@/lib/utils/oneRM'
import { format, parseISO, startOfWeek, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

const statusConfig = {
  active: { label: 'Activo', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  injured: { label: 'Lesionado', class: 'bg-red-500/20 text-red-300 border-red-500/30' },
  recovering: { label: 'Recuperación', class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  inactive: { label: 'Inactivo', class: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

export default async function AthleteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: athleteProfile } = await supabase
    .from('athlete_profiles')
    .select('*, user:user_id(id, name, email, avatar_url, created_at)')
    .eq('user_id', id)
    .eq('coach_id', user!.id)
    .single()

  if (!athleteProfile) notFound()

  const u = athleteProfile.user as { id: string; name: string; email: string; avatar_url: string | null; created_at: string } | null
  if (!u) notFound()

  const today = new Date()
  const eightWeeksAgo = format(subWeeks(today, 8), 'yyyy-MM-dd')

  // Parallel data fetching
  const [
    { data: metrics },
    { data: activePlan },
  ] = await Promise.all([
    supabase
      .from('body_metrics')
      .select('*')
      .eq('athlete_id', id)
      .order('measured_at', { ascending: true })
      .limit(20),
    supabase
      .from('athlete_plans')
      .select('*, plan:plan_id(name, type, duration_weeks)')
      .eq('athlete_id', id)
      .gte('end_date', format(today, 'yyyy-MM-dd'))
      .order('start_date', { ascending: false })
      .limit(1)
      .single(),
  ])

  // Sessions for adherence chart and recent list
  const { data: scheduledSessions } = activePlan
    ? await supabase
        .from('scheduled_sessions')
        .select('id, scheduled_date, status, session_templates(title)')
        .eq('athlete_plan_id', activePlan.id)
        .order('scheduled_date', { ascending: false })
        .limit(100)
    : { data: [] }

  // Completed sessions for load chart
  const { data: completedSessions } = await supabase
    .from('completed_sessions')
    .select('id, completed_at')
    .eq('athlete_id', id)
    .gte('completed_at', new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('completed_at')

  const completedIds = completedSessions?.map((s) => s.id) ?? []

  const { data: completedSets } = completedIds.length > 0
    ? await supabase
        .from('completed_sets')
        .select('completed_session_id, exercise_id, weight_kg, reps_done, rpe_actual, exercise_library(name)')
        .in('completed_session_id', completedIds)
    : { data: [] }

  // --- Build weekly load data ---
  const weeklyLoadMap: Record<string, { volume: number; rpeTotal: number; rpeCount: number }> = {}

  for (const session of completedSessions ?? []) {
    const weekLabel = format(
      startOfWeek(parseISO(session.completed_at!.split('T')[0]), { weekStartsOn: 1 }),
      'd MMM', { locale: es }
    )
    if (!weeklyLoadMap[weekLabel]) weeklyLoadMap[weekLabel] = { volume: 0, rpeTotal: 0, rpeCount: 0 }
    const sessionSets = (completedSets ?? []).filter((s) => s.completed_session_id === session.id)
    for (const set of sessionSets) {
      if (set.weight_kg && set.reps_done) weeklyLoadMap[weekLabel].volume += set.weight_kg * set.reps_done
      if (set.rpe_actual) { weeklyLoadMap[weekLabel].rpeTotal += set.rpe_actual; weeklyLoadMap[weekLabel].rpeCount++ }
    }
  }
  const weeklyLoadData = Object.entries(weeklyLoadMap).map(([week, d]) => ({
    week,
    volume: Math.round(d.volume),
    avgRpe: d.rpeCount > 0 ? Math.round((d.rpeTotal / d.rpeCount) * 10) / 10 : 0,
  }))

  // --- Build adherence data ---
  const adherenceMap: Record<string, { planned: number; completed: number }> = {}
  const past = (scheduledSessions ?? []).filter(
    (s) => s.scheduled_date <= format(today, 'yyyy-MM-dd') && s.scheduled_date >= eightWeeksAgo
  )
  for (const session of past) {
    const weekLabel = format(startOfWeek(parseISO(session.scheduled_date), { weekStartsOn: 1 }), 'd MMM', { locale: es })
    if (!adherenceMap[weekLabel]) adherenceMap[weekLabel] = { planned: 0, completed: 0 }
    adherenceMap[weekLabel].planned++
    if (session.status === 'done') adherenceMap[weekLabel].completed++
  }
  const adherenceData = Object.entries(adherenceMap).map(([week, d]) => ({ week, ...d }))

  // --- Build weight chart data ---
  const weightData = (metrics ?? []).map((m) => ({
    date: format(parseISO(m.measured_at), 'd MMM', { locale: es }),
    weight: m.weight_kg,
    bodyFat: m.body_fat_percent ?? undefined,
  }))

  // --- Build 1RM data per exercise ---
  const exerciseMap: Record<string, { name: string; sessions: { date: string; sets: { weight_kg: number; reps_done: number }[] }[] }> = {}
  for (const set of (completedSets ?? []).filter((s) => s.weight_kg && s.reps_done)) {
    const exName = (set.exercise_library as unknown as { name: string } | null)?.name ?? 'Ejercicio'
    if (!exerciseMap[set.exercise_id]) exerciseMap[set.exercise_id] = { name: exName, sessions: [] }
    const sessionDate = completedSessions?.find((s) => s.id === set.completed_session_id)?.completed_at
    if (!sessionDate) continue
    const dateLabel = format(parseISO(sessionDate.split('T')[0]), 'd MMM', { locale: es })
    let entry = exerciseMap[set.exercise_id].sessions.find((s) => s.date === dateLabel)
    if (!entry) { entry = { date: dateLabel, sets: [] }; exerciseMap[set.exercise_id].sessions.push(entry) }
    entry.sets.push({ weight_kg: set.weight_kg!, reps_done: set.reps_done! })
  }
  const oneRMCharts = Object.entries(exerciseMap)
    .filter(([, ex]) => ex.sessions.length >= 2)
    .slice(0, 4)
    .map(([id, ex]) => ({
      id,
      name: ex.name,
      data: ex.sessions.map((s) => ({
        date: s.date,
        oneRM: Math.max(...s.sets.map((set) => estimateOneRM(set.weight_kg, set.reps_done))),
      })),
    }))

  // Stats
  const doneCount = (scheduledSessions ?? []).filter((s) => s.status === 'done').length
  const totalPast = past.length
  const adherencePct = totalPast > 0 ? Math.round((doneCount / totalPast) * 100) : null

  const status = statusConfig[athleteProfile.status as keyof typeof statusConfig] ?? statusConfig.inactive
  const latestMetric = metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null
  const recentSessions = (scheduledSessions ?? []).slice(0, 5)

  const initials = u.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/athletes" className="text-slate-400 hover:text-slate-200 flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Volver a atletas
        </Link>
        <Link href={`/athletes/${id}/edit`}>
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Edit className="h-4 w-4 mr-2" />
            Editar perfil
          </Button>
        </Link>
      </div>

      {/* Header */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-16 w-16 flex-shrink-0">
              <AvatarImage src={u.avatar_url ?? undefined} />
              <AvatarFallback className="bg-emerald-700 text-white text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{u.name}</h1>
                <Badge variant="outline" className={`border ${status.class}`}>
                  {status.label}
                </Badge>
                {adherencePct !== null && (
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {adherencePct}% adherencia
                  </Badge>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1">{u.email}</p>
              <div className="flex gap-4 mt-3 flex-wrap text-sm">
                {athleteProfile.sport && (
                  <span className="text-slate-300"><span className="text-slate-500">Deporte:</span> {athleteProfile.sport}</span>
                )}
                {athleteProfile.position && (
                  <span className="text-slate-300"><span className="text-slate-500">Posición:</span> {athleteProfile.position}</span>
                )}
                {athleteProfile.birth_date && (
                  <span className="text-slate-300">
                    <span className="text-slate-500">Nacimiento:</span>{' '}
                    {new Date(athleteProfile.birth_date).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            </div>
          </div>
          {athleteProfile.notes_private && (
            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Notas privadas</p>
              <p className="text-slate-300 text-sm">{athleteProfile.notes_private}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Body metric stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Peso actual', value: latestMetric?.weight_kg ? `${latestMetric.weight_kg} kg` : '—' },
          { label: '% Grasa', value: latestMetric?.body_fat_percent ? `${latestMetric.body_fat_percent}%` : '—' },
          { label: 'Masa muscular', value: latestMetric?.muscle_mass_kg ? `${latestMetric.muscle_mass_kg} kg` : '—' },
          { label: 'Altura', value: latestMetric?.height_cm ? `${latestMetric.height_cm} cm` : '—' },
        ].map((stat) => (
          <Card key={stat.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan + sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-emerald-400" />
              Plan activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePlan ? (
              <div className="space-y-2">
                <p className="text-white font-medium">{(activePlan.plan as unknown as { name: string } | null)?.name}</p>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Tipo: {(activePlan.plan as unknown as { type: string } | null)?.type}</p>
                  <p>{new Date(activePlan.start_date).toLocaleDateString('es-ES')} → {new Date(activePlan.end_date).toLocaleDateString('es-ES')}</p>
                  <p>Carga: {activePlan.load_modifier_percent}%</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">Sin plan asignado</p>
                <Link href="/plans" className="text-emerald-400 text-xs hover:text-emerald-300 mt-2 inline-block">
                  Ir a planes →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Sesiones recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm">Sin sesiones aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((s) => (
                  <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0 hover:text-slate-100">
                    <div>
                      <p className="text-sm text-slate-300">
                        {(s.session_templates as unknown as { title: string } | null)?.title ?? 'Sesión'}
                      </p>
                      <p className="text-xs text-slate-600">{s.scheduled_date}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                      s.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {s.status === 'done' ? 'Hecha' : s.status === 'cancelled' ? 'Cancelada' : 'Planificada'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress charts */}
      {weightData.length >= 2 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Evolución de peso corporal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeightEvolutionChart data={weightData} />
          </CardContent>
        </Card>
      )}

      {weeklyLoadData.length >= 2 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Carga semanal
              <span className="text-xs text-slate-500 font-normal ml-1">Volumen + RPE</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyLoadChart data={weeklyLoadData} />
          </CardContent>
        </Card>
      )}

      {adherenceData.length >= 2 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Adherencia semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdherenceChart data={adherenceData} />
          </CardContent>
        </Card>
      )}

      {oneRMCharts.length > 0 && (
        <div>
          <h2 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-purple-400" />
            1RM Estimado por ejercicio
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {oneRMCharts.map((chart) => (
              <Card key={chart.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-300 text-sm">{chart.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <OneRMChart data={chart.data} exerciseName={chart.name} />
                  <p className="text-xs text-slate-600 mt-1 text-center">
                    Máximo: {Math.max(...chart.data.map((d) => d.oneRM))} kg
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Register body metric */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Registrar medición</CardTitle>
        </CardHeader>
        <CardContent>
          <BodyMetricForm athleteId={id} />
        </CardContent>
      </Card>

      {/* Metrics history */}
      {metrics && metrics.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 text-base">Historial de métricas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 text-xs border-b border-slate-800">
                    <th className="text-left pb-2 pr-4">Fecha</th>
                    <th className="text-right pb-2 pr-4">Peso</th>
                    <th className="text-right pb-2 pr-4">% Grasa</th>
                    <th className="text-right pb-2 pr-4">Músculo</th>
                    <th className="text-right pb-2">Altura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {[...metrics].reverse().map((m) => (
                    <tr key={m.id} className="text-slate-300">
                      <td className="py-2 pr-4 text-slate-400 text-xs">
                        {new Date(m.measured_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-2 pr-4 text-right">{m.weight_kg ? `${m.weight_kg} kg` : '—'}</td>
                      <td className="py-2 pr-4 text-right">{m.body_fat_percent ? `${m.body_fat_percent}%` : '—'}</td>
                      <td className="py-2 pr-4 text-right">{m.muscle_mass_kg ? `${m.muscle_mass_kg} kg` : '—'}</td>
                      <td className="py-2 text-right">{m.height_cm ? `${m.height_cm} cm` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
