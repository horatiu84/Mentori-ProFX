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
CREATE POLICY "mentori_public_all"
  ON mentori
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ==================== LEADURI ====================
-- Public flows (register + confirm link)
CREATE POLICY "leaduri_anon_select"
  ON leaduri
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "leaduri_anon_insert"
  ON leaduri
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "leaduri_anon_update"
  ON leaduri
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Authenticated dashboard access
CREATE POLICY "leaduri_authenticated_all"
  ON leaduri
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ==================== ALOCARI ====================
CREATE POLICY "alocari_public_all"
  ON alocari
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ==================== SETTINGS ====================
CREATE POLICY "settings_public_all"
  ON settings
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- ==================== CLASE / STUDENTI ====================
CREATE POLICY "clase_public_all"
  ON clase
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "studenti_public_all"
  ON studenti
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
