-- ============================================
-- SECURITY FIX: Enable RLS and Create Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- ==================== ENABLE RLS ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentori ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaduri ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocari ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE studenti ENABLE ROW LEVEL SECURITY;

-- ==================== DROP EXISTING POLICIES (if any) ====================
DROP POLICY IF EXISTS "Service role can do anything on users" ON users;
DROP POLICY IF EXISTS "Service role can do anything on mentori" ON mentori;
DROP POLICY IF EXISTS "Service role can do anything on leaduri" ON leaduri;
DROP POLICY IF EXISTS "Service role can do anything on alocari" ON alocari;
DROP POLICY IF EXISTS "Service role can do anything on settings" ON settings;
DROP POLICY IF EXISTS "Service role can do anything on clase" ON clase;
DROP POLICY IF EXISTS "Service role can do anything on studenti" ON studenti;

-- ==================== USERS TABLE POLICIES ====================
-- CRITICAL: Block all public access to users table (contains passwords!)
-- Only service role (Edge Functions) can access
CREATE POLICY "Only service role can access users"
  ON users
  FOR ALL
  USING (auth.role() = 'service_role');

-- ==================== MENTORI TABLE POLICIES ====================
-- Allow read access for anon (needed for dashboard)
CREATE POLICY "Anyone can read mentori"
  ON mentori
  FOR SELECT
  USING (true);

-- Allow updates for anon (needed for dashboard operations)
CREATE POLICY "Anyone can update mentori"
  ON mentori
  FOR UPDATE
  USING (true);

-- Allow insert for anon (needed for adding mentors)
CREATE POLICY "Anyone can insert mentori"
  ON mentori
  FOR INSERT
  WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role can do anything on mentori"
  ON mentori
  FOR ALL
  USING (auth.role() = 'service_role');

-- ==================== LEADURI TABLE POLICIES ====================
-- Allow full access for anon (needed for lead management)
CREATE POLICY "Anyone can read leaduri"
  ON leaduri
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert leaduri"
  ON leaduri
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update leaduri"
  ON leaduri
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete leaduri"
  ON leaduri
  FOR DELETE
  USING (true);

-- ==================== ALOCARI TABLE POLICIES ====================
CREATE POLICY "Anyone can access alocari"
  ON alocari
  FOR ALL
  USING (true);

-- ==================== SETTINGS TABLE POLICIES ====================
CREATE POLICY "Anyone can read settings"
  ON settings
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update settings"
  ON settings
  FOR UPDATE
  USING (true);

-- ==================== CLASE TABLE POLICIES ====================
CREATE POLICY "Anyone can access clase"
  ON clase
  FOR ALL
  USING (true);

-- ==================== STUDENTI TABLE POLICIES ====================
CREATE POLICY "Anyone can access studenti"
  ON studenti
  FOR ALL
  USING (true);

-- ==================== NOTES ====================
-- After applying these policies:
-- 1. USERS table is PROTECTED - no direct API access (passwords secured!)
-- 2. Other tables allow anon access (needed for current frontend architecture)
-- 3. Your Edge Functions using service_role key will continue to work
-- 4. This fixes the CRITICAL password exposure vulnerability
--
-- NEXT STEPS (Mandatory):
-- 1. Create a login Edge Function to handle authentication
-- 2. Hash all passwords (currently plain text!)
-- 3. Update Login.jsx to use the Edge Function instead of direct DB access
--
-- RECOMMENDED (For better security):
-- - Migrate ALL database operations to Edge Functions
-- - Consider using Supabase Auth instead of custom authentication
-- - Add more granular policies based on authenticated users
