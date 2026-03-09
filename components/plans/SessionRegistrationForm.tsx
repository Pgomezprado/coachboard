'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExerciseEntry {
  id: string
  exerciseId: string
  name: string
  sets: number
  repsMin: number | null
  repsMax: number | null
  weightKg: number | null
  rpeTarget: number | null
  loadModifier: number
}

interface SetLog {
  reps_done: string
  weight_kg: string
  rpe_actual: string
}

interface SessionRegistrationFormProps {
  scheduledSessionId: string
  athleteId: string
  exercises: ExerciseEntry[]
  currentStatus: 'planned' | 'done' | 'cancelled' | 'modified'
  completedSession: {
    id: string
    duration_min: number | null
    athlete_rpe: number | null
    athlete_notes: string | null
    coach_notes: string | null
  } | null
}

export function SessionRegistrationForm({
  scheduledSessionId,
  athleteId,
  exercises,
  currentStatus,
  completedSession,
}: SessionRegistrationFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [expanded, setExpanded] = useState(currentStatus === 'planned')

  // Estado de los sets por ejercicio
  const [setsLog, setSetsLog] = useState<Record<string, SetLog[]>>(
    Object.fromEntries(
      exercises.map((ex) => [
        ex.id,
        Array.from({ length: ex.sets }, () => ({
          reps_done: String(ex.repsMin ?? ''),
          weight_kg: ex.weightKg
            ? String(Math.round((ex.weightKg * ex.loadModifier) / 100 * 10) / 10)
            : '',
          rpe_actual: String(ex.rpeTarget ?? ''),
        })),
      ])
    )
  )

  const [sessionNotes, setSessionNotes] = useState({
    athlete_notes: completedSession?.athlete_notes ?? '',
    coach_notes: completedSession?.coach_notes ?? '',
    duration_min: String(completedSession?.duration_min ?? ''),
    athlete_rpe: String(completedSession?.athlete_rpe ?? ''),
  })

  function updateSet(exerciseId: string, setIdx: number, field: keyof SetLog, value: string) {
    setSetsLog((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i === setIdx ? { ...s, [field]: value } : s
      ),
    }))
  }

  async function completeSession() {
    setSaving(true)
    try {
      // 1. Crear completed_session
      const csRes = await fetch('/api/completed-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_id: scheduledSessionId,
          athlete_id: athleteId,
          duration_min: sessionNotes.duration_min || undefined,
          athlete_rpe: sessionNotes.athlete_rpe || undefined,
          athlete_notes: sessionNotes.athlete_notes || undefined,
          coach_notes: sessionNotes.coach_notes || undefined,
        }),
      })

      const csJson = await csRes.json()
      if (!csRes.ok) { toast.error(csJson.error ?? 'Error'); return }

      const completedSessionId = csJson.data.id

      // 2. Registrar sets completados
      const setsToInsert = exercises.flatMap((ex) =>
        (setsLog[ex.id] ?? []).map((s, idx) => ({
          completed_session_id: completedSessionId,
          exercise_id: ex.exerciseId,
          set_number: idx + 1,
          reps_done: s.reps_done ? Number(s.reps_done) : null,
          weight_kg: s.weight_kg ? Number(s.weight_kg) : null,
          rpe_actual: s.rpe_actual ? Number(s.rpe_actual) : null,
        }))
      )

      if (setsToInsert.length > 0) {
        await fetch('/api/completed-sets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sets: setsToInsert }),
        })
      }

      // 3. Marcar sesión como completada
      await fetch(`/api/sessions/${scheduledSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })

      toast.success('¡Sesión completada!')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function cancelSession() {
    setCancelling(true)
    await fetch(`/api/sessions/${scheduledSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setCancelling(false)
    toast.success('Sesión cancelada')
    router.refresh()
  }

  const isDone = currentStatus === 'done'
  const isCancelled = currentStatus === 'cancelled'

  const inputClass = 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 text-sm h-7 px-2'

  return (
    <Card className="bg-slate-900 border-slate-800">
      <button className="w-full" onClick={() => setExpanded((e) => !e)}>
        <CardHeader className="py-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-200 text-base flex items-center gap-2">
              {isDone ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : isCancelled ? (
                <XCircle className="h-5 w-5 text-red-400" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-slate-600" />
              )}
              {isDone ? 'Sesión completada' : isCancelled ? 'Sesión cancelada' : 'Registrar sesión'}
            </CardTitle>
            {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="px-5 pb-5 pt-0 space-y-5">
          {/* Sets por ejercicio */}
          {exercises.map((ex) => (
            <div key={ex.id}>
              <p className="text-sm font-medium text-slate-200 mb-2">{ex.name}</p>
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 mb-1 px-1">
                  <span>Serie</span>
                  <span>Reps</span>
                  <span>Peso (kg)</span>
                  <span>RPE</span>
                </div>
                {(setsLog[ex.id] ?? []).map((set, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                    <span className="text-xs text-slate-500 text-center">{idx + 1}</span>
                    <Input
                      type="number"
                      className={inputClass}
                      value={set.reps_done}
                      onChange={(e) => updateSet(ex.id, idx, 'reps_done', e.target.value)}
                      disabled={isDone || isCancelled}
                    />
                    <Input
                      type="number"
                      step="0.5"
                      className={inputClass}
                      value={set.weight_kg}
                      onChange={(e) => updateSet(ex.id, idx, 'weight_kg', e.target.value)}
                      disabled={isDone || isCancelled}
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      step={0.5}
                      className={inputClass}
                      value={set.rpe_actual}
                      onChange={(e) => updateSet(ex.id, idx, 'rpe_actual', e.target.value)}
                      disabled={isDone || isCancelled}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Datos generales de la sesión */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <Label className="text-slate-400 text-xs">Duración real (min)</Label>
              <Input
                type="number"
                className={inputClass}
                value={sessionNotes.duration_min}
                onChange={(e) => setSessionNotes((p) => ({ ...p, duration_min: e.target.value }))}
                disabled={isDone || isCancelled}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">RPE global del atleta</Label>
              <Input
                type="number"
                min={1}
                max={10}
                step={0.5}
                className={inputClass}
                value={sessionNotes.athlete_rpe}
                onChange={(e) => setSessionNotes((p) => ({ ...p, athlete_rpe: e.target.value }))}
                disabled={isDone || isCancelled}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-400 text-xs">Notas del atleta</Label>
              <textarea
                rows={2}
                placeholder="Sensaciones, observaciones..."
                className={`w-full px-2 py-1.5 rounded border text-sm resize-none bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500`}
                value={sessionNotes.athlete_notes}
                onChange={(e) => setSessionNotes((p) => ({ ...p, athlete_notes: e.target.value }))}
                disabled={isDone || isCancelled}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-slate-400 text-xs">Notas del entrenador</Label>
              <textarea
                rows={2}
                placeholder="Feedback para el atleta..."
                className={`w-full px-2 py-1.5 rounded border text-sm resize-none bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500`}
                value={sessionNotes.coach_notes}
                onChange={(e) => setSessionNotes((p) => ({ ...p, coach_notes: e.target.value }))}
                disabled={isDone || isCancelled}
              />
            </div>
          </div>

          {/* Acciones */}
          {!isDone && !isCancelled && (
            <div className="flex gap-3 pt-2 border-t border-slate-800">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={completeSession}
                disabled={saving || cancelling}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Completar sesión
              </Button>
              <Button
                variant="outline"
                className="border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-800 hover:bg-red-900/10"
                onClick={cancelSession}
                disabled={saving || cancelling}
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
