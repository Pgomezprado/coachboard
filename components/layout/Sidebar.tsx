'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  BarChart3,
  Dumbbell,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import NotificationBell from '@/components/notifications/NotificationBell'

interface SidebarProps {
  profile: UserProfile
}

const coachNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/athletes', icon: Users, label: 'Atletas' },
  { href: '/plans', icon: ClipboardList, label: 'Planes' },
  { href: '/exercises', icon: Dumbbell, label: 'Ejercicios' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/reports', icon: BarChart3, label: 'Reportes' },
]

const roleLabels: Record<string, string> = {
  coach_admin: 'Admin',
  coach_assistant: 'Asistente',
  athlete: 'Atleta',
}

const roleBadgeColors: Record<string, string> = {
  coach_admin: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  coach_assistant: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  athlete: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">CoachBoard</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">C</span>
          </div>
        )}
        {!collapsed && (
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setCollapsed(true)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Collapse button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 text-slate-400 hover:text-slate-200 p-1"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto mt-2">
        {coachNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User profile section */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Configuración' : undefined}
        >
          <Settings size={16} className="flex-shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </Link>

        <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-emerald-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{profile.name}</p>
              <Badge
                variant="outline"
                className={cn('text-xs px-1.5 py-0 border', roleBadgeColors[profile.role])}
              >
                {roleLabels[profile.role]}
              </Badge>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
