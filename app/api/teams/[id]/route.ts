import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { teamSchema } from '@/lib/validations/team'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      *,
      team_members (
        id,
        athlete_id,
        role_in_team,
        joined_at,
        athlete:athlete_id (
          user_id,
          sport,
          status,
          user:user_id ( id, name, email, avatar_url )
        )
      )
    `)
    .eq('id', id)
    .eq('coach_id', user.id)
    .single()

  if (error || !team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

  return NextResponse.json({ data: team })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = teamSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: team, error } = await supabase
    .from('teams')
    .update({
      name: parsed.data.name,
      sport: parsed.data.sport || null,
      description: parsed.data.description || null,
    })
    .eq('id', id)
    .eq('coach_id', user.id)
    .select()
    .single()

  if (error || !team) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })

  return NextResponse.json({ data: team })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)
    .eq('coach_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
