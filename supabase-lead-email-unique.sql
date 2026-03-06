UPDATE leaduri
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM leaduri
    WHERE email IS NOT NULL AND TRIM(email) <> ''
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Exista leaduri duplicate cu acelasi email. Curata duplicatele inainte de a crea indexul unic.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leaduri_email_normalized
ON leaduri (LOWER(TRIM(email)))
WHERE email IS NOT NULL AND TRIM(email) <> '';