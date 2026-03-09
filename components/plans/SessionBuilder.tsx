'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, Loader2, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DAYS_OF_WEEK } from '@/lib/validations/plan'
import type { Exercise } from '@/types'

interface SessionExercise {
  id: string
  exercise: { name: string; category: string } | null
  sets: number
  reps_min: number | null
  reps_max: number | null
  weight_kg: number | null
  rpe_target: number | null
  rest_sec: number | null
  notes: string | null
}

interface SessionTemplate {
  id: string
  day_of_week: number
  title: string
  estimated_duration_min: number | null
  session_exercises: SessionExercise[]
}

interface PlanWeekWithSessions {
  id: string
  week_number: number
  focus: string | null
  sessions: SessionTemplate[]
}

interface SessionBuilderProps {
  planId: string
  weeks: PlanWeekWithSessions[]
  exercises: Exercise[]
}

export function SessionBuilder({ planId, weeks: initialWeeks, exercises }: SessionBuilderProps) {
  const router = useRouter()
  const [weeks, setWeeks] = useState(initialWeeks)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(initialWeeks[0]?.id ?? null)
  const [addingSession, setAddingSession] = useState<string | null>(null) // weekId
  const [newSession, setNewSession] = useState({ day_of_week: 0, title: '', estimated_duration_min: '' })
  const [addingExercise, setAddingExercise] = useState<string | null>(null) // sessionId
  const [newExercise, setNewExercise] = useState({
    exercise_id: '',
    sets: 3,
    reps_min: 8,
    reps_max: 12,
    weight_kg: '',
    rpe_target: '',
    rest_sec: 90,
    notes: '',
  })
  const [savingSession, setSavingSession] = useState(false)
  const [savingExercise, setSavingExercise] = useState(false)

  async function createSession(weekId: string) {
    if (!newSession.title) return toast.error('El nombre de la sesión es requerido')
    setSavingSession(true)

    const res = await fetch(`/api/plans/${planId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_id: weekId,
        plan_id: planId,
        day_of_week: Number(newSession.day_of_week),
        title: newSession.title,
        estimated_duration_min: newSession.estimated_duration_min || undefined,
      }),
    })

    const json = await res.json()
    setSavingSession(false)

    if (!res.ok) {
      toast.error(json.error ?? 'Error al crear sesión')
      return
    }

    setWeeks((prev) =>
      prev.map((w) =>
        w.id === weekId
          ? { ...w, sessions: [...w.sessions, { ...json.data, session_exercises: [] }] }
          : w
      )
    )
    setAddingSession(null)
    setNewSession({ day_of_week: 0, title: '', estimated_duration_min: '' })
    toast.success('Sesión creada')
  }

  async function deleteSession(weekId: string, sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al eliminar'); return }

    setWeeks((prev) =>
      prev.map((w) =>
        w.id === weekId
          ? { ...w, sessions: w.sessions.filter((s) => s.id !== sessionId) }
          : w
      )
    )
    toast.success('Sesión eliminada')
  }

  async function addExerciseToSession(sessionId: string, weekId: string) {
    if (!newExercise.exercise_id) return toast.error('Selecciona un ejercicio')
    setSavingExercise(true)

    const week = weeks.find((w) => w.id === weekId)
    const session = week?.sessions.find((s) => s.id === sessionId)
    const order = session?.session_exercises.length ?? 0

    const res = await fetch(`/api/plans/${planId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        exercise_id: newExercise.exercise_id,
        order,
        sets: Number(newExercise.sets),
        reps_min: newExercise.reps_min || undefined,
        reps_max: newExercise.reps_max || undefined,
        weight_kg: newExercise.weight_kg || undefined,
        rpe_target: newExercise.rpe_target || undefined,
        rest_sec: newExercise.rest_sec || undefined,
        notes: newExercise.notes || undefined,
      }),
    })

    const json = await res.json()
    setSavingExercise(false)

    if (!res.ok) { toast.error(json.error ?? 'Error'); return }

    setWeeks((prev) =>
      prev.map((w) =>
        w.id === weekId
          ? {
              ...w,
              sessions: w.sessions.map((s) =>
                s.id === sessionId
                  ? { ...s, session_exercises: [...s.session_exercises, json.data] }
                  : s
              ),
            }
          : w
      )
    )
    setAddingExercise(null)
    setNewExercise({ exercise_id: '', sets: 3, reps_min: 8, reps_max: 12, weight_kg: '', rpe_target: '', rest_sec: 90, notes: '' })
    toast.success('Ejercicio añadido')
  }

  async function removeExercise(exerciseEntryId: string, sessionId: string, weekId: string) {
    const res = await fetch(`/api/session-exercises/${exerciseEntryId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Error al eliminar'); return }

    setWeeks((prev) =>
      prev.map((w) =>
        w.id === weekId
          ? {
              ...w,
              sessions: w.sessions.map((s) =>
                s.id === sessionId
                  ? { ...s, session_exercises: s.session_exercises.filter((e) => e.id !== exerciseEntryId) }
                  : s
              ),
            }
          : w
      )
    )
  }

  const inputClass = 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 text-sm h-8'

  return (
    <div className="space-y-3">
      {weeks.map((week) => (
        <Card key={week.id} className="bg-slate-900 border-slate-800">
          {/* Week header */}
          <button
            className="w-full"
            onClick={() => setExpandedWeek(expandedWeek === week.id ? null : week.id)}
          >
            <CardHeader className="py-3 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-slate-200 text-sm font-semibold">
                    Semana {week.week_number}
                  </CardTitle>
                  {week.focus && (
                    <span className="text-xs text-slate-500">{week.focus}</span>
                  )}
                  <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                    {week.sessions.length} sesión{week.sessions.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                {expandedWeek === week.id ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </div>
            </CardHeader>
          </button>

          {expandedWeek === week.id && (
            <CardContent className="px-5 pb-5 pt-0 space-y-3">
              {/* Sessions */}
              {week.sessions
                .sort((a, b) => a.day_of_week - b.day_of_week)
                .map((session) => (
                  <div key={session.id} className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-slate-100 text-sm">{session.title}</p>
                        <p className="text-xs text-slate-500">
                          {DAYS_OF_WEEK[session.day_of_week]}
                          {session.estimated_duration_min && ` · ${session.estimated_duration_min} min`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAddingExercise(addingExercise === session.id ? null : session.id)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Ejercicio
                        </button>
                        <button
                          onClick={() => deleteSession(week.id, session.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Exercises list */}
                    {session.session_exercises.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {session.session_exercises.map((ex, idx) => (
                          <div key={ex.id} className="flex items-center gap-2 py-1.5 px-2 bg-slate-700/50 rounded text-xs">
                            <GripVertical className="h-3 w-3 text-slate-600 flex-shrink-0" />
                            <span className="text-slate-500 w-4">{idx + 1}.</span>
                            <span className="text-slate-200 flex-1 truncate">
                              {ex.exercise?.name ?? 'Ejercicio'}
                            </span>
                            <span className="text-slate-400 flex-shrink-0">
                              {ex.sets}×{ex.reps_min ?? '?'}
                              {ex.reps_max && ex.reps_max !== ex.reps_min ? `-${ex.reps_max}` : ''}
                              {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                              {ex.rpe_target ? ` RPE${ex.rpe_target}` : ''}
                            </span>
                            <button
                              onClick={() => removeExercise(ex.id, session.id, week.id)}
                              className="text-slate-600 hover:text-red-400 flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add exercise inline form */}
                    {addingExercise === session.id && (
                      <div className="border border-slate-700 rounded-lg p-3 space-y-3 bg-slate-900/50 mt-2">
                        <p className="text-xs font-medium text-slate-400">Añadir ejercicio</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <select
                              className={`w-full px-2 py-1.5 rounded border text-sm ${inputClass}`}
                              value={newExercise.exercise_id}
                              onChange={(e) => setNewExercise((p) => ({ ...p, exercise_id: e.target.value }))}
                            >
                              <option value="">-- Seleccionar ejercicio --</option>
                              {exercises.map((ex) => (
                                <option key={ex.id} value={ex.id} className="bg-slate-800">
                                  {ex.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs">Series</Label>
                            <Input
                              type="number"
                              min={1}
                              className={inputClass}
                              value={newExercise.sets}
                              onChange={(e) => setNewExercise((p) => ({ ...p, sets: Number(e.target.value) }))}
                            />
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs">Reps (min-max)</Label>
                            <div className="flex gap-1">
                              <Input
                                type="number"
                                placeholder="8"
                                className={inputClass}
                                value={newExercise.reps_min}
                                onChange={(e) => setNewExercise((p) => ({ ...p, reps_min: Number(e.target.value) }))}
                              />
                              <Input
                                type="number"
                                placeholder="12"
                                className={inputClass}
                                value={newExercise.reps_max}
                                onChange={(e) => setNewExercise((p) => ({ ...p, reps_max: Number(e.target.value) }))}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs">Peso (kg)</Label>
                            <Input
                              type="number"
                              placeholder="—"
                              className={inputClass}
                              value={newExercise.weight_kg}
                              onChange={(e) => setNewExercise((p) => ({ ...p, weight_kg: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs">RPE objetivo</Label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              step={0.5}
                              placeholder="8"
                              className={inputClass}
                              value={newExercise.rpe_target}
                              onChange={(e) => setNewExercise((p) => ({ ...p, rpe_target: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label className="text-slate-500 text-xs">Descanso (seg)</Label>
                            <Input
                              type="number"
                              placeholder="90"
                              className={inputClass}
                              value={newExercise.rest_sec}
                              onChange={(e) => setNewExercise((p) => ({ ...p, rest_sec: Number(e.target.value) }))}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-slate-500 text-xs">Notas</Label>
                            <Input
                              placeholder="Indicaciones técnicas..."
                              className={inputClass}
                              value={newExercise.notes}
                              onChange={(e) => setNewExercise((p) => ({ ...p, notes: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7"
                            onClick={() => addExerciseToSession(session.id, week.id)}
                            disabled={savingExercise}
                          >
                            {savingExercise && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Añadir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 text-xs h-7"
                            onClick={() => setAddingExercise(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {/* Add session form */}
              {addingSession === week.id ? (
                <div className="border border-dashed border-slate-700 rounded-lg p-4 space-y-3 bg-slate-800/30">
                  <p className="text-xs font-medium text-slate-400">Nueva sesión</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <Label className="text-slate-500 text-xs">Día</Label>
                      <select
                        className={`w-full px-2 py-1.5 rounded border ${inputClass}`}
                        value={newSession.day_of_week}
                        onChange={(e) => setNewSession((p) => ({ ...p, day_of_week: Number(e.target.value) }))}
                      >
                        {DAYS_OF_WEEK.map((d, i) => (
                          <option key={i} value={i} className="bg-slate-800">{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-slate-500 text-xs">Nombre de la sesión *</Label>
                      <Input
                        placeholder="Ej: Tren superior, Pierna, Full body..."
                        className={inputClass}
                        value={newSession.title}
                        onChange={(e) => setNewSession((p) => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-500 text-xs">Duración (min)</Label>
                      <Input
                        type="number"
                        placeholder="60"
                        className={inputClass}
                        value={newSession.estimated_duration_min}
                        onChange={(e) => setNewSession((p) => ({ ...p, estimated_duration_min: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7"
                      onClick={() => createSession(week.id)}
                      disabled={savingSession}
                    >
                      {savingSession && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Crear sesión
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 text-xs h-7"
                      onClick={() => setAddingSession(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingSession(week.id)}
                  className="w-full border border-dashed border-slate-700 rounded-lg p-3 text-sm text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Añadir sesión a la semana {week.week_number}
                </button>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
