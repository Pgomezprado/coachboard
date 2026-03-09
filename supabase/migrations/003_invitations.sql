-- ============================================================
-- Fase 2: Tabla de invitaciones por email
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Coach can see their own invitations
CREATE POLICY "coach_select_invitations"
  ON invitations FOR SELECT
  USING (coach_id = auth.uid());

-- Coach can create invitations
CREATE POLICY "coach_insert_invitations"
  ON invitations FOR INSERT
  WITH CHECK (coach_id = auth.uid());

-- Coach can delete their own invitations
CREATE POLICY "coach_delete_invitations"
  ON invitations FOR DELETE
  USING (coach_id = auth.uid());

-- Service role can update (mark as accepted)
CREATE POLICY "service_update_invitations"
  ON invitations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations(token);
CREATE INDEX IF NOT EXISTS invitations_coach_id_idx ON invitations(coach_id);
