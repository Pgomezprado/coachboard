import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: teams } = await supabase
    .from('teams')
    .select(`
      *,
      team_members ( id )
    `)
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipos</h1>
          <p className="text-slate-400 text-sm mt-1">
            {teams?.length ?? 0} equipo{(teams?.length ?? 0) !== 1 ? 's' : ''} creado{(teams?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/teams/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo equipo
          </Button>
        </Link>
      </div>

      {/* Grid */}
      {!teams || teams.length === 0 ? (
        <div className="text-center py-20">
          <Shield className="h-14 w-14 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Aún no tienes equipos</p>
          <p className="text-slate-600 text-sm mt-1">Crea un equipo para gestionar grupos de atletas.</p>
          <Link href="/teams/new" className="mt-4 inline-block">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear primer equipo
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => {
            const memberCount = (team.team_members as { id: string }[])?.length ?? 0
            return (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="bg-slate-800 border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer group">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                        <Shield className="h-5 w-5 text-emerald-400" />
                      </div>
                      {team.sport && (
                        <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300 text-xs">
                          {team.sport}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-white font-semibold text-base">{team.name}</h3>
                      {team.description && (
                        <p className="text-slate-400 text-sm mt-0.5 line-clamp-2">{team.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{memberCount} miembro{memberCount !== 1 ? 's' : ''}</span>
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
