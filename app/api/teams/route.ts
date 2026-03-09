import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { teamSchema } from '@/lib/validations/team'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: teams, error } = await supabase
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
          user:user_id ( id, name, avatar_url )
        )
      )
    `)
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: teams ?? [] })
}

export async function POST(request: Request) {
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
    .insert({
      coach_id: user.id,
      name: parsed.data.name,
      sport: parsed.data.sport || null,
      description: parsed.data.description || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: team }, { status: 201 })
}
