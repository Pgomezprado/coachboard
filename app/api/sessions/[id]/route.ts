import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que el template pertenece a un plan del coach
  const { data: template } = await supabase
    .from('session_templates')
    .select('plan_id')
    .eq('id', id)
    .single()

  if (!template) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data: plan } = await supabase
    .from('training_plans')
    .select('coach_id')
    .eq('id', template.plan_id)
    .single()

  if (!plan || plan.coach_id !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { error } = await supabase.from('session_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PATCH /api/sessions/[id] — actualizar estado de una sesión programada
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const { status } = body

  const { data, error } = await supabase
    .from('scheduled_sessions')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
