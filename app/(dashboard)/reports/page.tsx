import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, CheckCircle2, AlertTriangle, Activity, Shield } from 'lucide-react'
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import AdherenceChart from '@/components/charts/AdherenceChart'
import WeeklyLoadChart from '@/components/charts/WeeklyLoadChart'

const statusConfig = {
  active:     { label: 'Activo',       class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  injured:    { label: 'Lesionado',    class: 'bg-red-500/20 text-red-300 border-red-500/30' },
  recovering: { label: 'Recuperación', class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  inactive:   { label: 'Inactivo',     class: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date()
  const eightWeeksAgo = format(subWeeks(today, 8), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  // Cargar datos en paralelo
  const [
    { data: athletes },
    { data: teams },
    { data: completedSessions },
    { data: scheduledThisWeek },
  ] = await Promise.all([
    supabase
      .from('athlete_profiles')
      .select('id, user_id, sport, status, user:user_id(id, name, avatar_url)')
      .eq('coach_id', user!.id),
    supabase
      .from('teams')
      .select('id, name, sport, team_members(id)')
      .eq('coach_id', user!.id),
    supabase
      .from('completed_sessions')
      .select('id, completed_at, athlete_id, athlete_rpe, duration_min')
      .in(
        'athlete_id',
        (await supabase.from('athlete_profiles').select('user_id').eq('coach_id', user!.id))
          .data?.map((a) => a.user_id) ?? []
      )
      .gte('completed_at', eightWeeksAgo),
    supabase
      .from('scheduled_sessions')
      .select('id, status, athlete_plan_id')
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd),
  ])

  const athleteIds = athletes?.map((a) => a.user_id) ?? []

  // Stats globales
  const totalAthletes = athletes?.length ?? 0
  const activeAthletes = athletes?.filter((a) => a.status === 'active').length ?? 0
  const injuredAthletes = athletes?.filter(
    (a) => a.status === 'injured' || a.status === 'recovering'
  ).length ?? 0

  const sessionsThisWeek = scheduledThisWeek?.length ?? 0
  const doneThisWeek = scheduledThisWeek?.filter((s) => s.status === 'done').length ?? 0
  const adherenceGlobal = sessionsThisWeek > 0
    ? Math.round((doneThisWeek / sessionsThisWeek) * 100)
    : 0

  const totalCompletedSessions = completedSessions?.length ?? 0
  const avgRpe = completedSessions && completedSessions.length > 0
    ? (completedSessions.reduce((sum, s) => sum + (s.athlete_rpe ?? 0), 0) / completedSessions.filter(s => s.athlete_rpe).length).toFixed(1)
    : '—'

  // Adherencia por atleta (últimas 8 semanas) — tomamos los últimas 5 por actividad
  const athleteStats = (athletes ?? []).map((athlete) => {
    const sessions = completedSessions?.filter((s) => s.athlete_id === athlete.user_id) ?? []
    const u = athlete.user as unknown as { id: string; name: string; avatar_url: string | null } | null
    return {
      id: athlete.user_id,
      name: u?.name ?? '—',
      avatar_url: u?.avatar_url ?? null,
      sport: athlete.sport,
      status: athlete.status as keyof typeof statusConfig,
      completedCount: sessions.length,
      lastSession: sessions.length > 0
        ? format(new Date(sessions.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0].completed_at), 'dd MMM', { locale: es })
        : null,
    }
  }).sort((a, b) => b.completedCount - a.completedCount)

  // Datos para gráfico de carga semanal global (últimas 8 semanas)
  const loadByWeek: Record<string, number> = {}
  completedSessions?.forEach((s) => {
    const weekKey = format(startOfWeek(new Date(s.completed_at), { weekStartsOn: 1 }), 'dd/MM')
    loadByWeek[weekKey] = (loadByWeek[weekKey] ?? 0) + 1
  })
  // Calcular RPE promedio por semana
  const rpeByWeek: Record<string, { sum: number; count: number }> = {}
  completedSessions?.forEach((s) => {
    const weekKey = format(startOfWeek(new Date(s.completed_at), { weekStartsOn: 1 }), 'dd/MM')
    if (!rpeByWeek[weekKey]) rpeByWeek[weekKey] = { sum: 0, count: 0 }
    if (s.athlete_rpe) {
      rpeByWeek[weekKey].sum += s.athlete_rpe
      rpeByWeek[weekKey].count++
    }
  })

  const loadChartData = Object.entries(loadByWeek)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count]) => ({
      week,
      volume: count,
      avgRpe: rpeByWeek[week]?.count > 0
        ? Math.round((rpeByWeek[week].sum / rpeByWeek[week].count) * 10) / 10
        : 0,
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reportes</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen global de tu equipo de atletas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-slate-400" />
              <p className="text-slate-400 text-xs uppercase tracking-wider">Total atletas</p>
            </div>
            <p className="text-3xl font-bold text-white">{totalAthletes}</p>
            <p className="text-emerald-400 text-xs mt-1">{activeAthletes} activos</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
              <p className="text-slate-400 text-xs uppercase tracking-wider">Adherencia semana</p>
            </div>
            <p className="text-3xl font-bold text-white">{adherenceGlobal}%</p>
            <p className="text-slate-500 text-xs mt-1">{doneThisWeek}/{sessionsThisWeek} sesiones</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <p className="text-slate-400 text-xs uppercase tracking-wider">Sesiones (8 sem)</p>
            </div>
            <p className="text-3xl font-bold text-white">{totalCompletedSessions}</p>
            <p className="text-slate-500 text-xs mt-1">RPE promedio: {avgRpe}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-slate-400" />
              <p className="text-slate-400 text-xs uppercase tracking-wider">Lesionados</p>
            </div>
            <p className="text-3xl font-bold text-red-400">{injuredAthletes}</p>
            <p className="text-slate-500 text-xs mt-1">de {totalAthletes} atletas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      {loadChartData.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm font-medium">Carga global — últimas 8 semanas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <WeeklyLoadChart data={loadChartData} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teams summary */}
        {(teams?.length ?? 0) > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" />
                Equipos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {teams!.map((team) => {
                const count = (team.team_members as { id: string }[])?.length ?? 0
                return (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{team.name}</p>
                      {team.sport && <p className="text-xs text-slate-500">{team.sport}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                      <Users className="h-3.5 w-3.5" />
                      <span>{count}</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Athlete ranking by activity */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              Actividad por atleta (últimas 8 semanas)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {athleteStats.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Sin datos todavía</p>
            ) : (
              athleteStats.slice(0, 8).map((a) => {
                const st = statusConfig[a.status] ?? statusConfig.inactive
                const maxSessions = athleteStats[0]?.completedCount || 1
                const pct = Math.round((a.completedCount / maxSessions) * 100)
                const initials = a.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <div key={a.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {initials}
                        </div>
                        <span className="text-sm text-slate-200 truncate max-w-[120px]">{a.name}</span>
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 border ${st.class}`}>
                          {st.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-400">{a.completedCount} ses.</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
