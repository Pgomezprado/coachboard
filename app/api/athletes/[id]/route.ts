import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { athleteSchema } from '@/lib/validations/athlete'

// PATCH /api/athletes/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = athleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, sport, position, birth_date, status, notes_private } = parsed.data

  // Actualizar perfil de atleta (RLS verifica que el coach sea el owner)
  const { data, error } = await supabase
    .from('athlete_profiles')
    .update({
      sport: sport || null,
      position: position || null,
      birth_date: birth_date || null,
      status,
      notes_private: notes_private || null,
    })
    .eq('user_id', id)
    .eq('coach_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar nombre
  await supabase.from('users').update({ name }).eq('id', id)

  return NextResponse.json({ data })
}

// DELETE /api/athletes/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('athlete_profiles')
    .delete()
    .eq('user_id', id)
    .eq('coach_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
