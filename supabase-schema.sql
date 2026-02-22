-- ============================================
-- Supabase Schema for ProFX Mentori
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mentor',  -- 'admin' or 'mentor'
  "mentorId" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default admin user
INSERT INTO users (username, password, role, "mentorId") VALUES
  ('admin', 'admin', 'admin', NULL)
ON CONFLICT (username) DO NOTHING;

-- ==================== MENTORI ====================
CREATE TABLE IF NOT EXISTS mentori (
  id TEXT PRIMARY KEY,  -- e.g., 'sergiu', 'dan', 'tudor', etc.
  nume TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password TEXT,
  active BOOLEAN DEFAULT TRUE,
  available BOOLEAN DEFAULT TRUE,
  "ultimulOneToTwenty" TIMESTAMPTZ,
  "ordineCoada" INTEGER DEFAULT 0,
  "leaduriAlocate" INTEGER DEFAULT 0,
  "manuallyDisabled" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== LEADURI ====================
CREATE TABLE IF NOT EXISTS leaduri (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nume TEXT NOT NULL,
  telefon TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'nealocat',
  "mentorAlocat" TEXT REFERENCES mentori(id) ON DELETE SET NULL,
  "alocareId" UUID,
  "dataAlocare" TIMESTAMPTZ,
  "dataConfirmare" TIMESTAMPTZ,
  "dataTimeout" TIMESTAMPTZ,
  "emailTrimis" BOOLEAN DEFAULT FALSE,
  "dataTrimiereEmail" TIMESTAMPTZ,
  "confirmatPrinLink" BOOLEAN DEFAULT FALSE,
  "confirmationToken" TEXT,
  "istoricMentori" JSONB DEFAULT '[]'::jsonb,
  "numarReAlocari" INTEGER DEFAULT 0,
  observatii TEXT DEFAULT '',
  "statusOneToTwenty" TEXT DEFAULT 'pending',
  "dataOneToTwenty" TIMESTAMPTZ,
  "motivNeconfirmare" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ALOCARI ====================
CREATE TABLE IF NOT EXISTS alocari (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "mentorId" TEXT REFERENCES mentori(id) ON DELETE CASCADE,
  "mentorNume" TEXT,
  "numarLeaduri" INTEGER DEFAULT 0,
  leaduri JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'activa',
  "ultimaActualizare" TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SETTINGS ====================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,   -- e.g., 'emailTemplate'
  subject TEXT,
  body TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CLASE ====================
CREATE TABLE IF NOT EXISTS clase (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  "startDate" TEXT,
  "endDate" TEXT,
  "studentIds" JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== STUDENTI ====================
CREATE TABLE IF NOT EXISTS studenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  "classId" UUID REFERENCES clase(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== DISABLE RLS ====================
-- (Aplicatia foloseste autentificare custom, nu Supabase Auth)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentori DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaduri DISABLE ROW LEVEL SECURITY;
ALTER TABLE alocari DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE clase DISABLE ROW LEVEL SECURITY;
ALTER TABLE studenti DISABLE ROW LEVEL SECURITY;

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_leaduri_status ON leaduri(status);
CREATE INDEX IF NOT EXISTS idx_leaduri_mentor ON leaduri("mentorAlocat");
CREATE INDEX IF NOT EXISTS idx_leaduri_email ON leaduri(email);
CREATE INDEX IF NOT EXISTS idx_leaduri_telefon ON leaduri(telefon);
CREATE INDEX IF NOT EXISTS idx_alocari_mentor ON alocari("mentorId");
CREATE INDEX IF NOT EXISTS idx_studenti_class ON studenti("classId");

-- ==================== INSERT DEFAULT MENTOR USERS ====================
-- (Acesti useri se folosesc pentru login)
INSERT INTO users (username, password, role, "mentorId") VALUES
  ('Sergiu', 'Sergiu', 'mentor', 'sergiu'),
  ('Dan', 'Dan', 'mentor', 'dan'),
  ('Tudor', 'Tudor', 'mentor', 'tudor'),
  ('Eli', 'Eli', 'mentor', 'eli'),
  ('Adrian', 'Adrian', 'mentor', 'adrian')
ON CONFLICT (username) DO NOTHING;

-- ==================== THREE-SESSION PROGRAM COLUMNS ====================
-- Run these ALTER TABLE statements in Supabase SQL Editor if upgrading an existing DB
ALTER TABLE leaduri ADD COLUMN IF NOT EXISTS prezenta1 BOOLEAN DEFAULT NULL;
ALTER TABLE leaduri ADD COLUMN IF NOT EXISTS prezenta2 BOOLEAN DEFAULT NULL;
ALTER TABLE leaduri ADD COLUMN IF NOT EXISTS prezenta3 BOOLEAN DEFAULT NULL;
ALTER TABLE mentori ADD COLUMN IF NOT EXISTS "webinar2Date" TIMESTAMPTZ;
ALTER TABLE mentori ADD COLUMN IF NOT EXISTS "webinar3Date" TIMESTAMPTZ;
