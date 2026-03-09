import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  // Find valid invitation
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invitation) {
    return NextResponse.json({ error: 'Invitación inválida o expirada' }, { status: 404 })
  }

  // Link athlete to coach
  await supabase
    .from('athlete_profiles')
    .update({ coach_id: invitation.coach_id })
    .eq('user_id', user.id)

  // Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ success: true })
}
