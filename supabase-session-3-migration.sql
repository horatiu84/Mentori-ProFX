-- =====================================================
-- Session 3 migration for ProFX webinar program
-- Date: 2026-02-22
-- Run this script once in Supabase SQL Editor
-- =====================================================

BEGIN;

-- 1) Add third attendance column for leads
ALTER TABLE leaduri
  ADD COLUMN IF NOT EXISTS prezenta3 BOOLEAN DEFAULT NULL;

-- 2) Add third webinar date column for mentors
ALTER TABLE mentori
  ADD COLUMN IF NOT EXISTS "webinar3Date" TIMESTAMPTZ;

COMMIT;

-- Optional verification queries:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'leaduri' AND column_name IN ('prezenta1', 'prezenta2', 'prezenta3');

-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'mentori' AND column_name IN ('ultimulOneToTwenty', 'webinar2Date', 'webinar3Date');
