import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TeamForm } from '@/components/teams/TeamForm'

export default function NewTeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teams" className="text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo equipo</h1>
          <p className="text-slate-400 text-sm mt-0.5">Crea un grupo para gestionar atletas juntos</p>
        </div>
      </div>

      <TeamForm />
    </div>
  )
}
