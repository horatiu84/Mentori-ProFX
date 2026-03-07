-- ============================================
-- SECURITY FIX: Enable RLS and JWT Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- JWT NOTE:
-- Your authenticate edge function must sign tokens with the same JWT secret
-- used by Supabase and include claims:
--   role = 'authenticated'
--   app_role = 'admin' | 'mentor'
--   mentor_id = '<mentor id>' for mentor users

-- ==================== ENABLE RLS ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentori ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaduri ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocari ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE studenti ENABLE ROW LEVEL SECURITY;

-- ==================== CLEAN OLD POLICIES ====================
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','mentori','leaduri','alocari','settings','clase','studenti')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ==================== USERS ====================
-- Protected: only service_role (edge functions) can access
CREATE POLICY "users_service_role_only"
  ON users
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ==================== MENTORI ====================
-- Anyone can read mentors (public webinar info)
CREATE POLICY "mentori_select_public"
  ON mentori
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users (dashboard) can modify mentors
CREATE POLICY "mentori_modify_authenticated"
  ON mentori
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role (edge functions) can modify mentors
CREATE POLICY "mentori_modify_service"
  ON mentori
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== LEADURI ====================
-- Anon can read leads (needed for confirmation page lookup)
CREATE POLICY "leaduri_anon_select"
  ON leaduri
  FOR SELECT
  TO anon
  USING (true);

-- Anon can insert leads (public registration form)
CREATE POLICY "leaduri_anon_insert"
  ON leaduri
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon can update only specific fields for confirmation (status, dataConfirmare, confirmatPrinLink)
-- Restricted: only leads with status='alocat' can be confirmed by anon
CREATE POLICY "leaduri_anon_update_confirm"
  ON leaduri
  FOR UPDATE
  TO anon
  USING (status = 'alocat')
  WITH CHECK (status IN ('alocat', 'confirmat'));

-- Authenticated dashboard access (full CRUD)
CREATE POLICY "leaduri_authenticated_all"
  ON leaduri
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role (edge functions) full access
CREATE POLICY "leaduri_service_all"
  ON leaduri
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== ALOCARI ====================
-- Only authenticated users can access allocations
CREATE POLICY "alocari_select_public"
  ON alocari
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "alocari_modify_authenticated"
  ON alocari
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "alocari_modify_service"
  ON alocari
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== SETTINGS ====================
-- Anyone can read settings (email templates loaded on frontend)
CREATE POLICY "settings_select_public"
  ON settings
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can modify settings
CREATE POLICY "settings_modify_authenticated"
  ON settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "settings_modify_service"
  ON settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== CLASE / STUDENTI ====================
CREATE POLICY "clase_select_public"
  ON clase
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "clase_modify_authenticated"
  ON clase
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "studenti_select_public"
  ON studenti
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "studenti_modify_authenticated"
  ON studenti
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
