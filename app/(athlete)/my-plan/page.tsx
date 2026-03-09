import { createClient } from '@/lib/supabase/server'
import { Calendar, Dumbbell, TrendingUp, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

function getStatusLabel(status: string) {
  switch (status) {
    case 'active': return '🟢 Activo'
    case 'injured': return '🔴 Lesionado'
    case 'recovery': return '🟡 Recuperación'
    default: return '⚪ Inactivo'
  }
}

function getStatusColors(status: string) {
  switch (status) {
    case 'active': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'injured': return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'recovery': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  }
}

function getSessionLabel(date: string) {
  const d = parseISO(date)
  if (isToday(d)) return 'Hoy'
  if (isTomorrow(d)) return 'Mañana'
  return format(d, 'EEEE d MMM', { locale: es })
}

export default async function MyPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: athleteProfile }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user!.id).single(),
    supabase.from('athlete_profiles')
      .select('*, coach:coach_id(name)')
      .eq('user_id', user!.id)
      .single(),
  ])

  const athleteId = athleteProfile?.id

  // Active plan assignment
  const { data: activePlan } = athleteId
    ? await supabase
        .from('athlete_plans')
        .select('*, training_plans(name, description, duration_weeks, type)')
        .eq('athlete_id', athleteId)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: false })
        .limit(1)
        .single()
        .then((r) => r)
    : { data: null }

  // This week's sessions
  const today = new Date()
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { data: weeklySessions } = activePlan
    ? await supabase
        .from('scheduled_sessions')
        .select('*, session_templates(title, estimated_duration_min)')
        .eq('athlete_plan_id', activePlan.id)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .order('scheduled_date')
    : { data: [] }

  // Upcoming sessions (next 5)
  const { data: upcomingSessions } = activePlan
    ? await supabase
        .from('scheduled_sessions')
        .select('id, scheduled_date, status, session_templates(title, estimated_duration_min)')
        .eq('athlete_plan_id', activePlan.id)
        .gte('scheduled_date', format(today, 'yyyy-MM-dd'))
        .in('status', ['planned', 'modified'])
        .order('scheduled_date')
        .limit(5)
    : { data: [] }

  // Overall adherence
  const { data: allSessions } = activePlan
    ? await supabase
        .from('scheduled_sessions')
        .select('status')
        .eq('athlete_plan_id', activePlan.id)
        .lte('scheduled_date', format(today, 'yyyy-MM-dd'))
    : { data: [] }

  const doneCount = allSessions?.filter((s) => s.status === 'done').length ?? 0
  const totalPast = allSessions?.length ?? 0
  const adherencePct = totalPast > 0 ? Math.round((doneCount / totalPast) * 100) : null

  const weekDone = weeklySessions?.filter((s) => s.status === 'done').length ?? 0
  const weekTotal = weeklySessions?.length ?? 0

  const plan = activePlan?.training_plans as { name: string; description: string; duration_weeks: number; type: string } | null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola, {profile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">Tu plan de entrenamiento activo</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={`${getStatusColors(athleteProfile?.status ?? '')} border`}>
          {getStatusLabel(athleteProfile?.status ?? '')}
        </Badge>
        {athleteProfile?.coach && (
          <span className="text-slate-500 text-sm">
            Entrenador:{' '}
            <span className="text-slate-300">
              {(athleteProfile.coach as { name: string }).name}
            </span>
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Sesiones esta semana</p>
              <p className="text-xl font-bold text-white">{weekDone}/{weekTotal}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Adherencia total</p>
              <p className="text-xl font-bold text-white">
                {adherencePct !== null ? `${adherencePct}%` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-purple-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Próxima sesión</p>
              <p className="text-xl font-bold text-white">
                {upcomingSessions && upcomingSessions.length > 0
                  ? getSessionLabel(upcomingSessions[0].scheduled_date)
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan activo */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-emerald-400" />
            Plan activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!plan ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">Tu entrenador aún no te ha asignado un plan.</p>
              <p className="text-slate-600 text-xs mt-2">Contacta a tu entrenador para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="text-white font-semibold">{plan.name}</h3>
                {plan.description && (
                  <p className="text-slate-400 text-sm mt-1">{plan.description}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {plan.duration_weeks} semanas
                </span>
                <span className="capitalize">{plan.type}</span>
                {activePlan?.start_date && (
                  <span>
                    Inicio: {format(parseISO(activePlan.start_date), 'd MMM yyyy', { locale: es })}
                  </span>
                )}
                {activePlan?.load_modifier_percent && activePlan.load_modifier_percent !== 100 && (
                  <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs">
                    Carga: {activePlan.load_modifier_percent}%
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximas sesiones */}
      {upcomingSessions && upcomingSessions.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Próximas sesiones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingSessions.map((session) => {
              const tmpl = session.session_templates as unknown as { title: string; estimated_duration_min: number } | null
              return (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{tmpl?.title ?? 'Sesión'}</p>
                      <p className="text-slate-500 text-xs capitalize">
                        {getSessionLabel(session.scheduled_date)}
                        {tmpl?.estimated_duration_min && ` · ${tmpl.estimated_duration_min} min`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Link>
              )
            })}
            <div className="pt-1">
              <Link href="/my-sessions">
                <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-slate-200">
                  Ver todas mis sesiones →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
