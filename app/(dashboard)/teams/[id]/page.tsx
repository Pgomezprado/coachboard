import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shield, Pencil, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AddMemberModal } from '@/components/teams/AddMemberModal'
import { RemoveMemberButton } from '@/components/teams/RemoveMemberButton'

const statusConfig = {
  active:     { label: 'Activo',       class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  injured:    { label: 'Lesionado',    class: 'bg-red-500/20 text-red-300 border-red-500/30' },
  recovering: { label: 'Recuperación', class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  inactive:   { label: 'Inactivo',     class: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: team } = await supabase
    .from('teams')
    .select(`
      *,
      team_members (
        id,
        athlete_id,
        role_in_team,
        joined_at,
        athlete:athlete_id (
          id,
          user_id,
          sport,
          status,
          user:user_id ( id, name, email, avatar_url )
        )
      )
    `)
    .eq('id', id)
    .eq('coach_id', user!.id)
    .single()

  if (!team) notFound()

  // Atletas del coach que NO están en el equipo todavía
  const memberAthleteIds = (team.team_members as unknown as { athlete_id: string }[])
    .map((m) => m.athlete_id)

  let athletesQuery = supabase
    .from('athlete_profiles')
    .select('id, user_id, sport, status, user:user_id(id, name, email, avatar_url)')
    .eq('coach_id', user!.id)

  if (memberAthleteIds.length > 0) {
    athletesQuery = athletesQuery.not('id', 'in', `(${memberAthleteIds.join(',')})`)
  }

  const { data: availableAthletes } = await athletesQuery

  const members = team.team_members as unknown as {
    id: string
    athlete_id: string
    role_in_team: string | null
    joined_at: string
    athlete: {
      id: string
      user_id: string
      sport: string | null
      status: keyof typeof statusConfig
      user: { id: string; name: string; email: string; avatar_url: string | null } | null
    } | null
  }[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/teams" className="text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              {team.sport && (
                <Badge variant="outline" className="bg-slate-700 border-slate-600 text-slate-300">
                  {team.sport}
                </Badge>
              )}
            </div>
            {team.description && (
              <p className="text-slate-400 text-sm mt-0.5">{team.description}</p>
            )}
          </div>
        </div>
        <Link href={`/teams/${id}/edit`}>
          <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-800">
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Miembros</p>
            <p className="text-2xl font-bold text-white mt-1">{members.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Activos</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {members.filter((m) => m.athlete?.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Lesionados</p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {members.filter((m) => m.athlete?.status === 'injured' || m.athlete?.status === 'recovering').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members list */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              Miembros del equipo
            </CardTitle>
            <AddMemberModal
              teamId={id}
              availableAthletes={(availableAthletes ?? []) as never}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {members.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Sin miembros aún</p>
              <p className="text-slate-600 text-xs mt-1">Añade atletas para empezar a gestionar el equipo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const a = member.athlete
                const u = a?.user
                if (!u) return null
                const initials = u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                const st = statusConfig[a!.status] ?? statusConfig.inactive
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-emerald-600 text-white text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/athletes/${a!.user_id}`}
                            className="text-sm font-medium text-slate-200 hover:text-emerald-400 transition-colors"
                          >
                            {u.name}
                          </Link>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 border ${st.class}`}
                          >
                            {st.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {a?.sport ?? u.email}
                          {member.role_in_team && ` · ${member.role_in_team}`}
                        </p>
                      </div>
                    </div>
                    <RemoveMemberButton teamId={id} athleteId={member.athlete_id} />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
