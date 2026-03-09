'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { planSchema, type PlanFormData, PLAN_TYPES } from '@/lib/validations/plan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PlanFormProps {
  defaultValues?: Partial<PlanFormData>
  planId?: string
  mode: 'create' | 'edit'
}

export function PlanForm({ defaultValues, planId, mode }: PlanFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema) as never,
    defaultValues: {
      type: 'mixed',
      duration_weeks: 4,
      status: 'draft',
      ...defaultValues,
    },
  })

  async function onSubmit(data: PlanFormData) {
    const url = mode === 'create' ? '/api/plans' : `/api/plans/${planId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Error al guardar')
      return
    }

    toast.success(mode === 'create' ? 'Plan creado' : 'Plan actualizado')
    if (mode === 'create') {
      router.push(`/plans/${json.data.id}`)
    } else {
      router.refresh()
    }
  }

  const fieldClass =
    'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Información del plan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-slate-300">Nombre del plan *</Label>
            <Input placeholder="Ej: Fuerza máxima 4 semanas" className={fieldClass} {...register('name')} />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-slate-300">Descripción</Label>
            <textarea
              rows={3}
              placeholder="Describe el objetivo del plan, a quién está dirigido..."
              className={`w-full px-3 py-2 rounded-md border text-sm resize-none ${fieldClass}`}
              {...register('description')}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Tipo de plan</Label>
            <select className={`w-full px-3 py-2 rounded-md border text-sm ${fieldClass}`} {...register('type')}>
              {PLAN_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-slate-800">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Duración (semanas)</Label>
            <Input
              type="number"
              min={1}
              max={52}
              placeholder="4"
              className={fieldClass}
              {...register('duration_weeks', { valueAsNumber: true })}
            />
            {errors.duration_weeks && <p className="text-red-400 text-xs">{errors.duration_weeks.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Estado</Label>
            <select className={`w-full px-3 py-2 rounded-md border text-sm ${fieldClass}`} {...register('status')}>
              <option value="draft" className="bg-slate-800">Borrador</option>
              <option value="published" className="bg-slate-800">Publicado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Crear plan y añadir sesiones →' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
