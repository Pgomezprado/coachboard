import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ExerciseForm } from '@/components/exercises/ExerciseForm'

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exercise } = await supabase
    .from('exercise_library')
    .select('*')
    .eq('id', id)
    .eq('coach_id', user!.id)
    .single()

  if (!exercise) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/exercises" className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Editar ejercicio</h1>
      </div>
      <ExerciseForm
        mode="edit"
        exerciseId={id}
        defaultValues={{
          name: exercise.name,
          category: exercise.category,
          muscle_groups: exercise.muscle_groups ?? [],
          equipment: exercise.equipment ?? '',
          video_url: exercise.video_url ?? '',
          instructions: exercise.instructions ?? '',
          is_public: exercise.is_public,
        }}
      />
    </div>
  )
}
