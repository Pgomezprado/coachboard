import { createClient } from '@/lib/supabase/server'
import { Users, Calendar, TrendingUp, Activity, ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Stats del coach
  const { count: athleteCount } = await supabase
    .from('athlete_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user!.id)
    .eq('status', 'active')

  const { count: plansCount } = await supabase
    .from('training_plans')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', user!.id)
    .eq('status', 'published')

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user!.id)
    .single()

  const stats = [
    {
      title: 'Atletas activos',
      value: athleteCount ?? 0,
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Planes publicados',
      value: plansCount ?? 0,
      icon: ClipboardList,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Sesiones esta semana',
      value: 0,
      icon: Calendar,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Adherencia global',
      value: '—',
      icon: TrendingUp,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Buen día, {profile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Aquí tienes el resumen de tu plataforma
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-slate-900 border-slate-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-200 text-base">Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Añadir atleta', href: '/athletes/new' },
              { label: 'Crear plan de entrenamiento', href: '/plans/new' },
              { label: 'Ver calendario', href: '/calendar' },
              { label: 'Añadir ejercicio', href: '/exercises/new' },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="block px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm transition-colors"
              >
                + {action.label}
              </a>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-200 text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">
                Aún no hay actividad registrada.
              </p>
              <p className="text-slate-600 text-xs mt-1">
                Crea tu primer plan y asígnalo a un atleta.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

