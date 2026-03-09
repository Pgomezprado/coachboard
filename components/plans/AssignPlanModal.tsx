'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { assignPlanSchema, type AssignPlanFormData } from '@/lib/validations/plan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Athlete {
  user_id: string
  user: { name: string; email: string } | null
}

interface AssignPlanModalProps {
  planId: string
  athletes: Athlete[]
}

export function AssignPlanModal({ planId, athletes }: AssignPlanModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignPlanFormData>({
    resolver: zodResolver(assignPlanSchema) as never,
    defaultValues: {
      load_modifier_percent: 100,
      start_date: new Date().toISOString().split('T')[0],
    },
  })

  async function onSubmit(data: AssignPlanFormData) {
    const res = await fetch(`/api/plans/${planId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Error al asignar')
      return
    }

    toast.success(`Plan asignado. ${json.sessions_created} sesiones generadas.`)
    setOpen(false)
    reset()
    router.refresh()
  }

  const fieldClass =
    'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="bg-blue-600 hover:bg-blue-500 text-white" type="button">
          <UserPlus className="h-4 w-4 mr-2" />
          Asignar a atleta
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Asignar plan a atleta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Atleta *</Label>
            <select
              className={`w-full px-3 py-2 rounded-md border text-sm ${fieldClass}`}
              {...register('athlete_id')}
            >
              <option value="">-- Seleccionar atleta --</option>
              {athletes.map((a) => (
                <option key={a.user_id} value={a.user_id} className="bg-slate-800">
                  {a.user?.name ?? a.user_id} ({a.user?.email})
                </option>
              ))}
            </select>
            {errors.athlete_id && <p className="text-red-400 text-xs">{errors.athlete_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Fecha de inicio *</Label>
            <Input type="date" className={fieldClass} {...register('start_date')} />
            {errors.start_date && <p className="text-red-400 text-xs">{errors.start_date.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">
              Modificador de carga (%)
              <span className="text-slate-500 font-normal text-xs ml-2">
                100% = sin cambios · 80% = carga reducida
              </span>
            </Label>
            <Input
              type="number"
              min={10}
              max={200}
              className={fieldClass}
              {...register('load_modifier_percent', { valueAsNumber: true })}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar y generar sesiones
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
