-- ============================================
-- PASSWORD HASH MIGRATION (bcrypt via pgcrypto)
-- Run once in Supabase SQL Editor
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash existing plaintext passwords.
-- Safe to rerun: already-hashed bcrypt values (starting with $2a/$2b/$2y) are skipped.
UPDATE users
SET password = crypt(password, gen_salt('bf', 12))
WHERE password IS NOT NULL
  AND length(password) > 0
  AND password !~ '^\$2[aby]\$';

-- Optional: verify result shape
-- SELECT username, left(password, 4) AS prefix FROM users;
