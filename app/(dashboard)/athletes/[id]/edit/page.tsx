import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AthleteForm } from '@/components/athletes/AthleteForm'

export default async function EditAthletePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: athlete } = await supabase
    .from('athlete_profiles')
    .select('*, user:user_id(name, email)')
    .eq('user_id', id)
    .eq('coach_id', user!.id)
    .single()

  if (!athlete) notFound()

  const u = athlete.user as { name: string; email: string } | null

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/athletes/${id}`} className="text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Editar atleta</h1>
      </div>
      <AthleteForm
        mode="edit"
        athleteId={id}
        defaultValues={{
          name: u?.name ?? '',
          email: u?.email ?? '',
          sport: athlete.sport ?? '',
          position: athlete.position ?? '',
          birth_date: athlete.birth_date ?? '',
          status: athlete.status,
          notes_private: athlete.notes_private ?? '',
        }}
      />
    </div>
  )
}
