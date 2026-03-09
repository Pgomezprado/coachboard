import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bodyMetricSchema } from '@/lib/validations/athlete'

// POST /api/athletes/[id]/metrics
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = bodyMetricSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { measured_at, weight_kg, body_fat_percent, muscle_mass_kg, height_cm, notes } = parsed.data

  const { data, error } = await supabase
    .from('body_metrics')
    .insert({
      athlete_id: id,
      measured_at,
      weight_kg: weight_kg || null,
      body_fat_percent: body_fat_percent || null,
      muscle_mass_kg: muscle_mass_kg || null,
      height_cm: height_cm || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
