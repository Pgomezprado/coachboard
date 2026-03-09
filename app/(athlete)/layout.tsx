import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AthleteNav } from '@/components/layout/AthleteNav'
import type { UserProfile } from '@/types'

export default async function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Coaches van al dashboard principal
  if (profile.role !== 'athlete') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <AthleteNav profile={profile as UserProfile} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
