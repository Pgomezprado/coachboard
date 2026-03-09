import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const invite = searchParams.get('invite')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If invited, accept the invitation and link athlete to coach
      if (invite) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: invitation } = await supabase
            .from('invitations')
            .select('*')
            .eq('token', invite)
            .is('accepted_at', null)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle()

          if (invitation) {
            await supabase
              .from('athlete_profiles')
              .update({ coach_id: invitation.coach_id })
              .eq('user_id', user.id)

            await supabase
              .from('invitations')
              .update({ accepted_at: new Date().toISOString() })
              .eq('id', invitation.id)

            return NextResponse.redirect(`${origin}/my-plan`)
          }
        }
      }

      // Determine redirect based on role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'athlete') {
          return NextResponse.redirect(`${origin}/my-plan`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
