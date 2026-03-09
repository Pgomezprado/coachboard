-- ============================================================
-- Fase 3: RLS para team_members
-- ============================================================

-- Coaches gestionan miembros de sus equipos
CREATE POLICY "coaches_manage_team_members"
  ON public.team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.coach_id = auth.uid()
    )
  );

-- Atletas pueden ver los equipos a los que pertenecen
CREATE POLICY "athletes_view_own_team_members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles ap
      WHERE ap.id = team_members.athlete_id AND ap.user_id = auth.uid()
    )
  );
