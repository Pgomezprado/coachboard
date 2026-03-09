import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { athleteSchema } from '@/lib/validations/athlete'

// POST /api/athletes — crear atleta e invitarlo
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que es coach
  const { data: coachProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!coachProfile || !['coach_admin', 'coach_assistant'].includes(coachProfile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = athleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, sport, position, birth_date, status, notes_private } = parsed.data

  // 1. Crear el usuario en Supabase Auth (admin API) con rol athlete
  // Como no tenemos service role en client, usamos el approach de "invitación"
  // Primero revisamos si ya existe un usuario con ese email
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  let athleteUserId: string

  if (existingUser) {
    // El usuario ya tiene cuenta — solo crear/actualizar su perfil de atleta
    athleteUserId = existingUser.id
  } else {
    // Crear un registro "pendiente" — el atleta se registrará con su email
    // Guardamos email en athlete_profiles para cuando se registre
    // Por ahora creamos un placeholder
    return NextResponse.json(
      { error: 'El atleta debe registrarse primero en la plataforma. Comparte el link de registro con él.' },
      { status: 400 }
    )
  }

  // 2. Crear o actualizar athlete_profile
  const { data: profile, error: profileError } = await supabase
    .from('athlete_profiles')
    .upsert({
      user_id: athleteUserId,
      coach_id: user.id,
      sport: sport || null,
      position: position || null,
      birth_date: birth_date || null,
      status,
      notes_private: notes_private || null,
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // 3. Actualizar el nombre si hace falta
  await supabase
    .from('users')
    .update({ name })
    .eq('id', athleteUserId)

  return NextResponse.json({ data: profile }, { status: 201 })
}
