import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Dumbbell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CATEGORIES, MUSCLE_GROUPS } from '@/lib/validations/exercise'

const categoryLabel = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]))
const muscleLabel = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.value, m.label]))

const categoryColors: Record<string, string> = {
  strength: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cardio: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  flexibility: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  plyometrics: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  sport_specific: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q, category } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('exercise_library')
    .select('*')
    .or(`coach_id.eq.${user!.id},is_public.eq.true`)
    .order('name')

  if (category) query = query.eq('category', category)

  const { data: exercises } = await query

  const filtered = exercises?.filter((e) => {
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.muscle_groups?.some((m: string) => muscleLabel[m]?.toLowerCase().includes(q.toLowerCase()))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ejercicios</h1>
          <p className="text-slate-400 text-sm mt-1">
            {exercises?.length ?? 0} ejercicio{(exercises?.length ?? 0) !== 1 ? 's' : ''} en tu biblioteca
          </p>
        </div>
        <Link href="/exercises/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo ejercicio
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o músculo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </form>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/exercises"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !category ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Todos
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={`/exercises?category=${c.value}${q ? `&q=${q}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                category === c.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Grid */}
      {!filtered || filtered.length === 0 ? (
        <div className="text-center py-20">
          <Dumbbell className="h-14 w-14 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">
            {q || category ? 'No se encontraron ejercicios' : 'Tu biblioteca está vacía'}
          </p>
          {!q && !category && (
            <Link href="/exercises/new" className="mt-4 inline-block">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer ejercicio
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((ex) => (
            <Link key={ex.id} href={`/exercises/${ex.id}/edit`}>
              <Card className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-all group cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="font-medium text-slate-100 group-hover:text-white leading-tight">
                      {ex.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-xs border flex-shrink-0 ${categoryColors[ex.category] ?? ''}`}
                    >
                      {categoryLabel[ex.category] ?? ex.category}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(ex.muscle_groups as string[])?.slice(0, 4).map((m) => (
                      <span
                        key={m}
                        className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full"
                      >
                        {muscleLabel[m] ?? m}
                      </span>
                    ))}
                    {(ex.muscle_groups as string[])?.length > 4 && (
                      <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-500 rounded-full">
                        +{ex.muscle_groups.length - 4}
                      </span>
                    )}
                  </div>
                  {ex.equipment && (
                    <p className="text-xs text-slate-600 mt-2">{ex.equipment}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
