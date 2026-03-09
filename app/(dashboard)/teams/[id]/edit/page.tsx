import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TeamForm } from '@/components/teams/TeamForm'
import { DeleteTeamButton } from '@/components/teams/DeleteTeamButton'

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .eq('coach_id', user!.id)
    .single()

  if (!team) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/teams/${id}`} className="text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Editar equipo</h1>
          <p className="text-slate-400 text-sm mt-0.5">{team.name}</p>
        </div>
      </div>

      <TeamForm
        teamId={id}
        defaultValues={{
          name: team.name,
          sport: team.sport ?? undefined,
          description: team.description ?? undefined,
        }}
      />

      <div className="border-t border-slate-800 pt-6">
        <p className="text-slate-500 text-sm mb-3">Zona de peligro</p>
        <DeleteTeamButton teamId={id} teamName={team.name} />
      </div>
    </div>
  )
}
