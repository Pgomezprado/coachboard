'use client'

import { useState } from 'react'
import { UserPlus, Search, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Athlete {
  id: string
  user_id: string
  sport: string | null
  status: string
  user: { id: string; name: string; email: string; avatar_url: string | null } | null
}

interface AddMemberModalProps {
  teamId: string
  availableAthletes: Athlete[]
  onAdded?: () => void
}

export function AddMemberModal({ teamId, availableAthletes, onAdded }: AddMemberModalProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const filtered = availableAthletes.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.user?.name?.toLowerCase().includes(q) ||
      a.user?.email?.toLowerCase().includes(q) ||
      a.sport?.toLowerCase().includes(q)
    )
  })

  async function addMember(athleteId: string) {
    setLoading(athleteId)
    const res = await fetch(`/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athlete_id: athleteId }),
    })
    setLoading(null)
    if (res.ok) {
      onAdded?.()
      router.refresh()
      setOpen(false)
      setSearch('')
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-500 text-white"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Añadir miembro
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Añadir atleta al equipo</DialogTitle>
          </DialogHeader>

          {availableAthletes.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">
              Todos tus atletas ya están en este equipo.
            </p>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar atleta..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
                {filtered.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Sin resultados</p>
                ) : (
                  filtered.map((a) => {
                    const initials = (a.user?.name ?? 'A')
                      .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.user?.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-emerald-600 text-white text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{a.user?.name}</p>
                            <p className="text-xs text-slate-500">{a.sport ?? a.user?.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 text-xs"
                          onClick={() => addMember(a.id)}
                          disabled={loading === a.id}
                        >
                          {loading === a.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Añadir'
                          )}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
