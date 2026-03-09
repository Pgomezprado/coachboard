import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExerciseForm } from '@/components/exercises/ExerciseForm'

export default function NewExercisePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/exercises" className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Nuevo ejercicio</h1>
      </div>
      <ExerciseForm mode="create" />
    </div>
  )
}
