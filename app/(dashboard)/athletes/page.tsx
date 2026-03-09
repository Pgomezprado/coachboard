import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AthleteCard } from '@/components/athletes/AthleteCard'
import InviteAthleteModal from '@/components/athletes/InviteAthleteModal'

export default async function AthletesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('athlete_profiles')
    .select(`
      *,
      user:user_id (id, name, email, avatar_url)
    `)
    .eq('coach_id', user!.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: athletes } = await query

  const filtered = athletes?.filter((a) => {
    if (!q) return true
    const search = q.toLowerCase()
    const u = a.user as { name: string; email: string } | null
    return (
      u?.name?.toLowerCase().includes(search) ||
      u?.email?.toLowerCase().includes(search) ||
      a.sport?.toLowerCase().includes(search)
    )
  })

  const statuses = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'injured', label: 'Lesionados' },
    { value: 'recovering', label: 'Recuperación' },
    { value: 'inactive', label: 'Inactivos' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Atletas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {athletes?.length ?? 0} atleta{(athletes?.length ?? 0) !== 1 ? 's' : ''} en tu roster
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InviteAthleteModal />
          <Link href="/athletes/new">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Añadir atleta
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, email o deporte..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <Link
              key={s.value}
              href={`/athletes?${s.value !== 'all' ? `status=${s.value}` : ''}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (status ?? 'all') === s.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {!filtered || filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-14 w-14 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">
            {q || status ? 'No se encontraron atletas' : 'Aún no tienes atletas'}
          </p>
          <p className="text-slate-600 text-sm mt-1">
            {!q && !status && 'Añade tu primer atleta para empezar a gestionar su entrenamiento.'}
          </p>
          {!q && !status && (
            <Link href="/athletes/new" className="mt-4 inline-block">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Añadir atleta
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((athlete) => (
            <AthleteCard key={athlete.id} athlete={athlete} />
          ))}
        </div>
      )}
    </div>
  )
}
