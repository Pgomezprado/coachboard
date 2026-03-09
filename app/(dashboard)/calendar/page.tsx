import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColors = {
  planned: 'bg-slate-700 text-slate-300',
  done: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-red-500/20 text-red-300',
  modified: 'bg-yellow-500/20 text-yellow-300',
}

const statusLabels = {
  planned: 'Planificada',
  done: 'Completada',
  cancelled: 'Cancelada',
  modified: 'Modificada',
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Calcular semana actual o la solicitada
  const today = new Date()
  const currentWeekStart = week ? new Date(week) : getMonday(today)
  const currentWeekEnd = new Date(currentWeekStart)
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6)

  const prevWeek = new Date(currentWeekStart)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(currentWeekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)

  // Obtener sesiones de la semana para todos los atletas del coach
  const { data: sessions } = await supabase
    .from('scheduled_sessions')
    .select(`
      id, scheduled_date, status,
      session_templates(title, estimated_duration_min),
      athlete_plans!inner(
        athlete_id,
        training_plans!inner(coach_id),
        athlete:athlete_id(name, avatar_url)
      )
    `)
    .gte('scheduled_date', formatDate(currentWeekStart))
    .lte('scheduled_date', formatDate(currentWeekEnd))
    .eq('athlete_plans.training_plans.coach_id', user!.id)
    .order('scheduled_date')

  // Agrupar por día de la semana
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    return {
      date,
      dateStr: formatDate(date),
      label: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      isToday: formatDate(date) === formatDate(today),
      sessions: sessions?.filter((s) => s.scheduled_date === formatDate(date)) ?? [],
    }
  })

  const totalSessions = sessions?.length ?? 0
  const doneSessions = sessions?.filter((s) => s.status === 'done').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-slate-400 text-sm mt-1">
            {totalSessions} sesiones · {doneSessions} completadas esta semana
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?week=${formatDate(prevWeek)}`}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-slate-300 text-sm font-medium px-2">
            {currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} —{' '}
            {currentWeekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <Link
            href={`/calendar?week=${formatDate(nextWeek)}`}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div key={day.dateStr} className="min-h-32">
            <div
              className={`text-center py-1.5 rounded-t-lg text-xs font-medium mb-1 ${
                day.isToday
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {day.label}
            </div>
            <div className="space-y-1">
              {day.sessions.map((session) => {
                const template = session.session_templates as unknown as { title: string; estimated_duration_min: number | null } | null
                const athletePlan = session.athlete_plans as unknown as { athlete: { name: string } | null } | null
                return (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div
                      className={`px-2 py-1.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                        statusColors[session.status as keyof typeof statusColors]
                      }`}
                    >
                      <p className="font-medium truncate">{template?.title ?? 'Sesión'}</p>
                      <p className="truncate opacity-70">{athletePlan?.athlete?.name ?? ''}</p>
                    </div>
                  </Link>
                )
              })}
              {day.sessions.length === 0 && (
                <div className="h-8" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* List view below */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-200 text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            Sesiones de la semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">Sin sesiones esta semana</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const template = session.session_templates as unknown as { title: string; estimated_duration_min: number | null } | null
                const athletePlan = session.athlete_plans as unknown as { athlete_id: string; athlete: { name: string; avatar_url: string | null } | null } | null
                return (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[40px]">
                          <p className="text-xs text-slate-500">
                            {new Date(session.scheduled_date).toLocaleDateString('es-ES', { weekday: 'short' })}
                          </p>
                          <p className="text-sm font-bold text-slate-200">
                            {new Date(session.scheduled_date).getDate()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{template?.title ?? 'Sesión'}</p>
                          <p className="text-xs text-slate-500">
                            {athletePlan?.athlete?.name ?? ''}
                            {template?.estimated_duration_min && ` · ${template.estimated_duration_min} min`}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${statusColors[session.status as keyof typeof statusColors]}`}>
                        {statusLabels[session.status as keyof typeof statusLabels]}
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
