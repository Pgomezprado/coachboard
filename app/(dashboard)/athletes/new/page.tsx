import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AthleteForm } from '@/components/athletes/AthleteForm'

export default function NewAthletePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/athletes"
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Añadir atleta</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            El atleta debe tener una cuenta en CoachBoard para poder vincularlo.
          </p>
        </div>
      </div>
      <AthleteForm mode="create" />
    </div>
  )
}
