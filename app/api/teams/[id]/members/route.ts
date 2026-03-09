import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/teams/[id]/members — añadir atleta al equipo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que el equipo pertenece al coach
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('coach_id', user.id)
    .single()

  if (!team) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })

  const { athlete_id, role_in_team } = await request.json()
  if (!athlete_id) return NextResponse.json({ error: 'athlete_id requerido' }, { status: 400 })

  // Verificar que el atleta pertenece al coach
  const { data: athleteProfile } = await supabase
    .from('athlete_profiles')
    .select('id')
    .eq('id', athlete_id)
    .eq('coach_id', user.id)
    .single()

  if (!athleteProfile) return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })

  const { data: member, error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      athlete_id,
      role_in_team: role_in_team || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'El atleta ya es miembro de este equipo' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: member }, { status: 201 })
}

// DELETE /api/teams/[id]/members — eliminar atleta del equipo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { athlete_id } = await request.json()
  if (!athlete_id) return NextResponse.json({ error: 'athlete_id requerido' }, { status: 400 })

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('athlete_id', athlete_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
