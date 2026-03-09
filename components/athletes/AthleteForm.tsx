'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { athleteSchema, type AthleteFormData } from '@/lib/validations/athlete'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AthleteFormProps {
  defaultValues?: Partial<AthleteFormData>
  athleteId?: string
  mode: 'create' | 'edit'
}

const statusOptions = [
  { value: 'active', label: '🟢 Activo' },
  { value: 'injured', label: '🔴 Lesionado' },
  { value: 'recovering', label: '🟡 Recuperación' },
  { value: 'inactive', label: '⚫ Inactivo' },
]

export function AthleteForm({ defaultValues, athleteId, mode }: AthleteFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AthleteFormData>({
    resolver: zodResolver(athleteSchema),
    defaultValues: {
      status: 'active',
      ...defaultValues,
    },
  })

  async function onSubmit(data: AthleteFormData) {
    const url = mode === 'create' ? '/api/athletes' : `/api/athletes/${athleteId}`
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

    toast.success(mode === 'create' ? 'Atleta añadido' : 'Perfil actualizado')
    router.push('/athletes')
    router.refresh()
  }

  const fieldClass =
    'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Nombre completo *</Label>
            <Input placeholder="Juan García" className={fieldClass} {...register('name')} />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">
              Email *{' '}
              {mode === 'edit' && (
                <span className="text-slate-500 text-xs font-normal">(no se puede cambiar)</span>
              )}
            </Label>
            <Input
              type="email"
              placeholder="atleta@email.com"
              className={fieldClass}
              disabled={mode === 'edit'}
              {...register('email')}
            />
            {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Fecha de nacimiento</Label>
            <Input type="date" className={fieldClass} {...register('birth_date')} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Estado</Label>
            <select
              className={`w-full px-3 py-2 rounded-md border text-sm ${fieldClass}`}
              {...register('status')}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-800">
                  {o.label}
                </option>
              ))}
            </select>
            {errors.status && <p className="text-red-400 text-xs">{errors.status.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Deporte</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Deporte</Label>
            <Input placeholder="Ej: Fútbol, CrossFit, Natación..." className={fieldClass} {...register('sport')} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Posición / Categoría</Label>
            <Input placeholder="Ej: Delantero, Principiante..." className={fieldClass} {...register('position')} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Notas privadas</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            rows={4}
            placeholder="Notas internas solo visibles para ti (lesiones previas, objetivos, observaciones...)"
            className={`w-full px-3 py-2 rounded-md border text-sm resize-none ${fieldClass}`}
            {...register('notes_private')}
          />
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
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Añadir atleta' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
