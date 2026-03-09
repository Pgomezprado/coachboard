import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PLAN_TYPES } from '@/lib/validations/plan'

const typeLabel = Object.fromEntries(PLAN_TYPES.map((t) => [t.value, t.label]))

const typeColors: Record<string, string> = {
  strength: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cardio: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  mixed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  sport_specific: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: plans } = await supabase
    .from('training_plans')
    .select(`
      *,
      plan_weeks(count),
      athlete_plans(count)
    `)
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false })

  const published = plans?.filter((p) => p.status === 'published').length ?? 0
  const drafts = plans?.filter((p) => p.status === 'draft').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planes de entrenamiento</h1>
          <p className="text-slate-400 text-sm mt-1">
            {published} publicado{published !== 1 ? 's' : ''} · {drafts} borrador{drafts !== 1 ? 'es' : ''}
          </p>
        </div>
        <Link href="/plans/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo plan
          </Button>
        </Link>
      </div>

      {!plans || plans.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList className="h-14 w-14 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Aún no tienes planes</p>
          <p className="text-slate-600 text-sm mt-1">Crea tu primer plan y asígnalo a tus atletas.</p>
          <Link href="/plans/new">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer plan
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const athleteCount = Array.isArray(plan.athlete_plans)
              ? plan.athlete_plans[0]?.count ?? 0
              : 0
            return (
              <Link key={plan.id} href={`/plans/${plan.id}`}>
                <Card className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-all group cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-slate-100 group-hover:text-white leading-tight">
                        {plan.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs border flex-shrink-0 ${
                          plan.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-600/20 text-slate-400 border-slate-600/30'
                        }`}
                      >
                        {plan.status === 'published' ? 'Publicado' : 'Borrador'}
                      </Badge>
                    </div>

                    {plan.description && (
                      <p className="text-slate-500 text-xs mb-3 line-clamp-2">{plan.description}</p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${typeColors[plan.type] ?? ''}`}
                      >
                        {typeLabel[plan.type] ?? plan.type}
                      </Badge>
                      <span className="text-xs text-slate-500">{plan.duration_weeks} sem</span>
                      {athleteCount > 0 && (
                        <span className="text-xs text-slate-500">· {athleteCount} atleta{athleteCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
