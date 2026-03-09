'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  exerciseSchema,
  type ExerciseFormData,
  MUSCLE_GROUPS,
  CATEGORIES,
} from '@/lib/validations/exercise'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExerciseFormProps {
  defaultValues?: Partial<ExerciseFormData>
  exerciseId?: string
  mode: 'create' | 'edit'
}

export function ExerciseForm({ defaultValues, exerciseId, mode }: ExerciseFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema) as never,
    defaultValues: {
      category: 'strength',
      muscle_groups: [],
      is_public: false,
      ...defaultValues,
    },
  })

  const selectedMuscles = watch('muscle_groups')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    const typed = data as ExerciseFormData
    const url = mode === 'create' ? '/api/exercises' : `/api/exercises/${exerciseId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typed),
    })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Error al guardar')
      return
    }

    toast.success(mode === 'create' ? 'Ejercicio creado' : 'Ejercicio actualizado')
    router.push('/exercises')
    router.refresh()
  }

  const fieldClass =
    'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Información básica</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-slate-300">Nombre del ejercicio *</Label>
            <Input placeholder="Ej: Sentadilla con barra" className={fieldClass} {...register('name')} />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Categoría *</Label>
            <select className={`w-full px-3 py-2 rounded-md border text-sm ${fieldClass}`} {...register('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-slate-800">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Equipamiento</Label>
            <Input placeholder="Ej: Barra, Mancuernas, Sin equipamiento..." className={fieldClass} {...register('equipment')} />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-slate-300">URL de video (opcional)</Label>
            <Input type="url" placeholder="https://youtube.com/..." className={fieldClass} {...register('video_url')} />
            {errors.video_url && <p className="text-red-400 text-xs">{errors.video_url.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Grupos musculares */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Grupos musculares *</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="muscle_groups"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map((m) => {
                  const selected = field.value.includes(m.value)
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          field.onChange(field.value.filter((v) => v !== m.value))
                        } else {
                          field.onChange([...field.value, m.value])
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        selected
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>
            )}
          />
          {errors.muscle_groups && (
            <p className="text-red-400 text-xs mt-2">{errors.muscle_groups.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base">Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            rows={5}
            placeholder="Describe la técnica de ejecución, puntos clave, errores comunes..."
            className={`w-full px-3 py-2 rounded-md border text-sm resize-none ${fieldClass}`}
            {...register('instructions')}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              className="w-4 h-4 accent-emerald-500"
              {...register('is_public')}
            />
            <Label htmlFor="is_public" className="text-slate-300 cursor-pointer">
              Hacer público (visible para todos los atletas)
            </Label>
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
          {mode === 'create' ? 'Crear ejercicio' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
