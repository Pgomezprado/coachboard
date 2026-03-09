import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { renderInvitationEmail } from '@/lib/email/invitationTemplate'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { email, name } = parsed.data

  // Get coach name
  const { data: coachProfile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!coachProfile || !['coach_admin', 'coach_assistant'].includes(coachProfile.role ?? '')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Check if already invited or already an athlete of this coach
  const { data: existing } = await supabase
    .from('invitations')
    .select('id, accepted_at, expires_at')
    .eq('coach_id', user.id)
    .eq('email', email)
    .maybeSingle()

  if (existing && !existing.accepted_at && new Date(existing.expires_at) > new Date()) {
    return NextResponse.json({ error: 'Ya existe una invitación activa para este email' }, { status: 409 })
  }

  // Create invitation record
  const { data: invitation, error: invErr } = await supabase
    .from('invitations')
    .insert({ coach_id: user.id, email, name: name ?? null })
    .select('token')
    .single()

  if (invErr || !invitation) {
    return NextResponse.json({ error: 'Error al crear la invitación' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl = `${appUrl}/register?invite=${invitation.token}&email=${encodeURIComponent(email)}`

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'CoachBoard <noreply@coachboard.app>',
      to: email,
      subject: `${coachProfile.name} te invita a unirte a CoachBoard`,
      html: renderInvitationEmail({
        coachName: coachProfile.name,
        athleteName: name ?? null,
        inviteUrl,
      }),
    })
  }

  return NextResponse.json({ success: true, inviteUrl })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, email, name, accepted_at, expires_at, created_at')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ invitations: invitations ?? [] })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('invitations').delete().eq('id', id).eq('coach_id', user.id)

  return NextResponse.json({ success: true })
}
