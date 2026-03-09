import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PlanForm } from '@/components/plans/PlanForm'

export default function NewPlanPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/plans" className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo plan</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Define el plan y luego agrega las sesiones de cada semana.
          </p>
        </div>
      </div>
      <PlanForm mode="create" />
    </div>
  )
}
