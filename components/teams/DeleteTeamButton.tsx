'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface DeleteTeamButtonProps {
  teamId: string
  teamName: string
}

export function DeleteTeamButton({ teamId, teamName }: DeleteTeamButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`¿Eliminar el equipo "${teamName}"? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.push('/teams')
      router.refresh()
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="border-red-800 text-red-400 hover:bg-red-900/20 hover:text-red-300"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
      Eliminar equipo
    </Button>
  )
}
