'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { bodyMetricSchema, type BodyMetricFormData } from '@/lib/validations/athlete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface BodyMetricFormProps {
  athleteId: string
}

export function BodyMetricForm({ athleteId }: BodyMetricFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BodyMetricFormData>({
    resolver: zodResolver(bodyMetricSchema) as never,
    defaultValues: { measured_at: today },
  })

  async function onSubmit(data: BodyMetricFormData) {
    const res = await fetch(`/api/athletes/${athleteId}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json()
      toast.error(json.error ?? 'Error al guardar')
      return
    }

    toast.success('Métrica registrada')
    reset({ measured_at: today })
    router.refresh()
  }

  const fieldClass =
    'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 text-sm'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1 space-y-1">
          <Label className="text-slate-400 text-xs">Fecha *</Label>
          <Input type="date" className={fieldClass} {...register('measured_at')} />
          {errors.measured_at && <p className="text-red-400 text-xs">{errors.measured_at.message}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Peso (kg)</Label>
          <Input type="number" step="0.1" placeholder="75.5" className={fieldClass} {...register('weight_kg')} />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">% Grasa</Label>
          <Input type="number" step="0.1" placeholder="18.5" className={fieldClass} {...register('body_fat_percent')} />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Masa muscular (kg)</Label>
          <Input type="number" step="0.1" placeholder="62" className={fieldClass} {...register('muscle_mass_kg')} />
        </div>
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Altura (cm)</Label>
          <Input type="number" step="0.1" placeholder="175" className={fieldClass} {...register('height_cm')} />
        </div>
        <div className="col-span-2 sm:col-span-1 space-y-1">
          <Label className="text-slate-400 text-xs">Notas</Label>
          <Input placeholder="Observaciones..." className={fieldClass} {...register('notes')} />
        </div>
      </div>
      <Button
        type="submit"
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-500 text-white"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
        Registrar medición
      </Button>
    </form>
  )
}
