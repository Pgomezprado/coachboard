import { createClient } from '@/lib/supabase/server'
import { TrendingUp, Weight, Activity, Dumbbell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import WeightEvolutionChart from '@/components/charts/WeightEvolutionChart'
import WeeklyLoadChart from '@/components/charts/WeeklyLoadChart'
import AdherenceChart from '@/components/charts/AdherenceChart'
import OneRMChart from '@/components/charts/OneRMChart'
import { estimateOneRM } from '@/lib/utils/oneRM'

export default async function MyProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: athleteProfile } = await supabase
    .from('athlete_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const athleteId = athleteProfile?.id

  // Body metrics
  const { data: bodyMetrics } = athleteId
    ? await supabase
        .from('body_metrics')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('measured_at', { ascending: true })
        .limit(20)
    : { data: [] }

  // Active plan for load & adherence charts
  const { data: activePlan } = athleteId
    ? await supabase
        .from('athlete_plans')
        .select('id')
        .eq('athlete_id', athleteId)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: false })
        .limit(1)
        .single()
    : { data: null }

  // Last 8 weeks of scheduled sessions for adherence
  const today = new Date()
  const eightWeeksAgo = format(subWeeks(today, 8), 'yyyy-MM-dd')

  const { data: scheduledSessions } = activePlan
    ? await supabase
        .from('scheduled_sessions')
        .select('scheduled_date, status')
        .eq('athlete_plan_id', activePlan.id)
        .gte('scheduled_date', eightWeeksAgo)
        .lte('scheduled_date', format(today, 'yyyy-MM-dd'))
        .order('scheduled_date')
    : { data: [] }

  // Completed sets for weekly load
  const { data: completedSessions } = activePlan
    ? await supabase
        .from('completed_sessions')
        .select('id, completed_at')
        .eq('athlete_id', athleteId!)
        .gte('completed_at', new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at')
    : { data: [] }

  const completedIds = completedSessions?.map((s) => s.id) ?? []

  const { data: completedSets } = completedIds.length > 0
    ? await supabase
        .from('completed_sets')
        .select('completed_session_id, weight_kg, reps_done, rpe_actual, exercise_id')
        .in('completed_session_id', completedIds)
    : { data: [] }

  // 1RM per exercise: get top exercises
  const { data: exercisesData } = completedIds.length > 0
    ? await supabase
        .from('completed_sets')
        .select('exercise_id, exercise_library(name), completed_session_id, weight_kg, reps_done')
        .in('completed_session_id', completedIds)
        .not('weight_kg', 'is', null)
    : { data: [] }

  // --- Build weekly load data ---
  const weeklyLoadMap: Record<string, { volume: number; rpeTotal: number; rpeCount: number }> = {}

  for (const session of completedSessions ?? []) {
    const weekLabel = format(
      startOfWeek(parseISO(session.completed_at!.split('T')[0]), { weekStartsOn: 1 }),
      'd MMM',
      { locale: es }
    )
    if (!weeklyLoadMap[weekLabel]) weeklyLoadMap[weekLabel] = { volume: 0, rpeTotal: 0, rpeCount: 0 }

    const sessionSets = (completedSets ?? []).filter(
      (s) => s.completed_session_id === session.id
    )
    for (const set of sessionSets) {
      if (set.weight_kg && set.reps_done) {
        weeklyLoadMap[weekLabel].volume += set.weight_kg * set.reps_done
      }
      if (set.rpe_actual) {
        weeklyLoadMap[weekLabel].rpeTotal += set.rpe_actual
        weeklyLoadMap[weekLabel].rpeCount += 1
      }
    }
  }

  const weeklyLoadData = Object.entries(weeklyLoadMap).map(([week, d]) => ({
    week,
    volume: Math.round(d.volume),
    avgRpe: d.rpeCount > 0 ? Math.round((d.rpeTotal / d.rpeCount) * 10) / 10 : 0,
  }))

  // --- Build adherence data ---
  const adherenceMap: Record<string, { planned: number; completed: number }> = {}

  for (const session of scheduledSessions ?? []) {
    const weekLabel = format(
      startOfWeek(parseISO(session.scheduled_date), { weekStartsOn: 1 }),
      'd MMM',
      { locale: es }
    )
    if (!adherenceMap[weekLabel]) adherenceMap[weekLabel] = { planned: 0, completed: 0 }
    adherenceMap[weekLabel].planned += 1
    if (session.status === 'done') adherenceMap[weekLabel].completed += 1
  }

  const adherenceData = Object.entries(adherenceMap).map(([week, d]) => ({
    week,
    planned: d.planned,
    completed: d.completed,
  }))

  // --- Build weight chart data ---
  const weightData = (bodyMetrics ?? []).map((m) => ({
    date: format(parseISO(m.measured_at), 'd MMM', { locale: es }),
    weight: m.weight_kg,
    bodyFat: m.body_fat_percent ?? undefined,
  }))

  // --- Build 1RM data per exercise ---
  const exerciseMap: Record<string, { name: string; sessions: { date: string; sets: { weight_kg: number; reps_done: number }[] }[] }> = {}

  for (const set of exercisesData ?? []) {
    if (!set.exercise_id || !set.weight_kg || !set.reps_done) continue
    const exName = (set.exercise_library as unknown as { name: string } | null)?.name ?? 'Ejercicio'
    if (!exerciseMap[set.exercise_id]) exerciseMap[set.exercise_id] = { name: exName, sessions: [] }

    const sessionDate = completedSessions?.find((s) => s.id === set.completed_session_id)?.completed_at
    if (!sessionDate) continue
    const dateLabel = format(parseISO(sessionDate.split('T')[0]), 'd MMM', { locale: es })

    let sessionEntry = exerciseMap[set.exercise_id].sessions.find((s) => s.date === dateLabel)
    if (!sessionEntry) {
      sessionEntry = { date: dateLabel, sets: [] }
      exerciseMap[set.exercise_id].sessions.push(sessionEntry)
    }
    sessionEntry.sets.push({ weight_kg: set.weight_kg, reps_done: set.reps_done })
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

  // Latest body metric
  const latest = bodyMetrics && bodyMetrics.length > 0 ? bodyMetrics[bodyMetrics.length - 1] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi progreso</h1>
        <p className="text-slate-400 text-sm mt-1">Evolución de tus métricas y rendimiento</p>
      </div>

      {/* Latest body metrics */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {latest.weight_kg && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-indigo-400">{latest.weight_kg}</p>
                <p className="text-slate-500 text-xs mt-0.5">kg · peso actual</p>
              </CardContent>
            </Card>
          )}
          {latest.body_fat_percent && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-400">{latest.body_fat_percent}%</p>
                <p className="text-slate-500 text-xs mt-0.5">% grasa corporal</p>
              </CardContent>
            </Card>
          )}
          {latest.muscle_mass_kg && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{latest.muscle_mass_kg}</p>
                <p className="text-slate-500 text-xs mt-0.5">kg · masa muscular</p>
              </CardContent>
            </Card>
          )}
          {latest.height_cm && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{latest.height_cm}</p>
                <p className="text-slate-500 text-xs mt-0.5">cm · altura</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Weight evolution chart */}
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

      {/* Weekly load chart */}
      {weeklyLoadData.length >= 2 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              Carga semanal
              <span className="text-xs text-slate-500 font-normal ml-1">Volumen (kg total) + RPE promedio</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyLoadChart data={weeklyLoadData} />
          </CardContent>
        </Card>
      )}

      {/* Adherence chart */}
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

      {/* 1RM charts */}
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

      {/* Empty state */}
      {!latest && weeklyLoadData.length === 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Aún no hay métricas registradas.</p>
            <p className="text-slate-600 text-xs mt-1">
              Los gráficos aparecerán conforme registres sesiones y métricas corporales.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Body metrics table */}
      {bodyMetrics && bodyMetrics.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 text-base">Historial de mediciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...bodyMetrics].reverse().map((m) => (
                <div key={m.id} className="p-3 rounded-lg bg-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 text-xs">
                    {format(parseISO(m.measured_at), 'd MMM yyyy', { locale: es })}
                  </span>
                  <div className="flex gap-4 text-sm">
                    {m.weight_kg && <span className="text-slate-200">{m.weight_kg} kg</span>}
                    {m.body_fat_percent && <span className="text-slate-400">{m.body_fat_percent}% grasa</span>}
                    {m.muscle_mass_kg && <span className="text-slate-400">{m.muscle_mass_kg} kg músculo</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
