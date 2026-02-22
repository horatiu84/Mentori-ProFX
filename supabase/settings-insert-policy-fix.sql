-- Fix for VIP/email template save errors on settings upsert
-- Error: new row violates row-level security policy for table "settings"

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert settings" ON settings;

CREATE POLICY "Anyone can insert settings"
  ON settings
  FOR INSERT
  WITH CHECK (true);
