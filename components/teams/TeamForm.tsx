'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { teamSchema, type TeamFormData } from '@/lib/validations/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TeamFormProps {
  defaultValues?: Partial<TeamFormData>
  teamId?: string
}

export function TeamForm({ defaultValues, teamId }: TeamFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const isEdit = Boolean(teamId)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema) as never,
    defaultValues,
  })

  async function onSubmit(data: TeamFormData) {
    setServerError(null)
    const url = isEdit ? `/api/teams/${teamId}` : '/api/teams'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json()
      setServerError(json.error ?? 'Error al guardar el equipo')
      return
    }

    router.push('/teams')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
      {serverError && (
        <div className="p-3 rounded-md bg-red-900/50 border border-red-700 text-red-300 text-sm">
          {serverError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-slate-300">Nombre del equipo *</Label>
        <Input
          id="name"
          placeholder="Ej: Sub-20 Masculino"
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
          {...register('name')}
        />
        {errors.name && <p className="text-red-400 text-sm">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sport" className="text-slate-300">Deporte</Label>
        <Input
          id="sport"
          placeholder="Ej: Fútbol, Basketball, Rugby..."
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
          {...register('sport')}
        />
        {errors.sport && <p className="text-red-400 text-sm">{errors.sport.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-slate-300">Descripción</Label>
        <textarea
          id="description"
          rows={3}
          placeholder="Descripción opcional del equipo..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-sm resize-none"
          {...register('description')}
        />
        {errors.description && <p className="text-red-400 text-sm">{errors.description.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
          ) : (
            isEdit ? 'Guardar cambios' : 'Crear equipo'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
