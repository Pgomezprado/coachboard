import { createClient } from '@/lib/supabase/server'
import { Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  done: { label: 'Completada', icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  cancelled: { label: 'Cancelada', icon: XCircle, color: 'text-red-300', bg: 'bg-red-500/10' },
  planned: { label: 'Planificada', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-700/50' },
  modified: { label: 'Modificada', icon: Clock, color: 'text-yellow-300', bg: 'bg-yellow-500/10' },
}

export default async function MySessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: athleteProfile } = await supabase
    .from('athlete_profiles')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: activePlan } = athleteProfile
    ? await supabase
        .from('athlete_plans')
        .select('id')
        .eq('athlete_id', athleteProfile.id)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: false })
        .limit(1)
        .single()
    : { data: null }

  const { data: sessions } = activePlan
    ? await supabase
        .from('scheduled_sessions')
        .select('*, session_templates(title, estimated_duration_min)')
        .eq('athlete_plan_id', activePlan.id)
        .order('scheduled_date', { ascending: false })
        .limit(50)
    : { data: [] }

  // Stats
  const total = sessions?.length ?? 0
  const done = sessions?.filter((s) => s.status === 'done').length ?? 0
  const upcoming = sessions?.filter((s) => s.status === 'planned').length ?? 0
  const adherence = total > 0 ? Math.round((done / total) * 100) : 0

  // Group by month
  type SessionItem = NonNullable<typeof sessions>[number]
  const grouped = (sessions ?? []).reduce<Record<string, SessionItem[]>>((acc, session) => {
    const month = format(parseISO(session!.scheduled_date), 'MMMM yyyy', { locale: es })
    if (!acc[month]) acc[month] = []
    acc[month]!.push(session!)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mis sesiones</h1>
        <p className="text-slate-400 text-sm mt-1">Historial y próximos entrenamientos</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Completadas', value: done, color: 'text-emerald-400' },
          { label: 'Pendientes', value: upcoming, color: 'text-blue-400' },
          { label: 'Adherencia', value: `${adherence}%`, color: 'text-purple-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sessions list */}
      {total === 0 ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay sesiones registradas aún.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([month, monthSessions]) => (
          <div key={month}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 capitalize">
              {month}
            </h3>
            <div className="space-y-2">
              {monthSessions?.map((session) => {
                const tmpl = session!.session_templates as { title: string; estimated_duration_min: number } | null
                const config = STATUS_CONFIG[session!.status] ?? STATUS_CONFIG.planned
                const Icon = config.icon
                const isPast = new Date(session!.scheduled_date) < new Date()
                const isClickable = session!.status === 'done' || (session!.status === 'planned' && !isPast)

                const content = (
                  <div className={`flex items-center justify-between p-3 rounded-lg ${config.bg} border border-slate-800 ${isClickable ? 'hover:border-slate-600 transition-colors' : ''}`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${config.color} shrink-0`} />
                      <div>
                        <p className="text-slate-200 text-sm font-medium">
                          {tmpl?.title ?? 'Sesión'}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {format(parseISO(session!.scheduled_date), 'EEEE d', { locale: es })}
                          {tmpl?.estimated_duration_min && ` · ${tmpl.estimated_duration_min} min`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs ${config.color}`}>{config.label}</span>
                  </div>
                )

                return isClickable ? (
                  <Link key={session!.id} href={`/sessions/${session!.id}`}>
                    {content}
                  </Link>
                ) : (
                  <div key={session!.id}>{content}</div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
