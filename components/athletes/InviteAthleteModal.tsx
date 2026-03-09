'use client'

import { useState } from 'react'
import { Mail, UserPlus, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export default function InviteAthleteModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar')
      setInviteUrl(data.inviteUrl)
      toast.success('Invitación enviada correctamente')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose(val: boolean) {
    setOpen(val)
    if (!val) {
      setEmail('')
      setName('')
      setInviteUrl(null)
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invitar atleta
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5 text-emerald-400" />
            Invitar atleta por email
          </DialogTitle>
        </DialogHeader>

        {!inviteUrl ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Email *</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="atleta@email.com"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Nombre (opcional)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del atleta"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <p className="text-xs text-slate-500">
              Se enviará un email con un enlace de registro. La invitación expira en 7 días.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {loading ? 'Enviando...' : 'Enviar invitación'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
              <p className="text-emerald-300 font-medium">¡Invitación enviada!</p>
              <p className="text-slate-400 text-sm mt-1">
                Se envió un email a <span className="text-slate-200">{email}</span>
              </p>
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Enlace de invitación</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <code className="flex-1 text-xs bg-slate-800 rounded px-3 py-2 text-slate-300 truncate">
                  {inviteUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="border-slate-700 shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)} className="bg-slate-700 hover:bg-slate-600">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
