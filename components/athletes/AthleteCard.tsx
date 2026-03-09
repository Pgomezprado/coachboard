import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

const statusConfig = {
  active: { label: 'Activo', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  injured: { label: 'Lesionado', class: 'bg-red-500/20 text-red-300 border-red-500/30' },
  recovering: { label: 'Recuperación', class: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  inactive: { label: 'Inactivo', class: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

interface AthleteCardProps {
  athlete: {
    user_id: string
    sport: string | null
    position: string | null
    status: 'active' | 'injured' | 'recovering' | 'inactive'
    user: { id: string; name: string; email: string; avatar_url: string | null } | null
  }
}

export function AthleteCard({ athlete }: AthleteCardProps) {
  const user = athlete.user
  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const status = statusConfig[athlete.status]

  return (
    <Link href={`/athletes/${user.id}`}>
      <Card className="bg-slate-900 border-slate-800 hover:border-slate-600 transition-all group cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 flex-shrink-0">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-emerald-700 text-white text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-100 truncate group-hover:text-white">
                  {user.name}
                </p>
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs border ${status.class}`}
                >
                  {status.label}
                </Badge>
                {athlete.sport && (
                  <span className="text-xs text-slate-500">{athlete.sport}</span>
                )}
                {athlete.position && (
                  <span className="text-xs text-slate-600">· {athlete.position}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
