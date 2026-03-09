'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RemoveMemberButtonProps {
  teamId: string
  athleteId: string
}

export function RemoveMemberButton({ teamId, athleteId }: RemoveMemberButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRemove() {
    if (!confirm('¿Eliminar este atleta del equipo?')) return
    setLoading(true)
    await fetch(`/api/teams/${teamId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
      title="Quitar del equipo"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
