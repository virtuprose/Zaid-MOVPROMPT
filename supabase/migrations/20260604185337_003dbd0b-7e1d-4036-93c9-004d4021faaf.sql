-- Restrict Realtime Broadcast/Presence: the app doesn't use them.
-- postgres_changes subscriptions are not gated by realtime.messages RLS,
-- so this only blocks broadcast/presence topic subscriptions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'realtime' AND c.relname = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    -- Drop if previously created so the migration is idempotent
    EXECUTE 'DROP POLICY IF EXISTS "Deny broadcast and presence" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Deny broadcast and presence"
      ON realtime.messages
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false)
    $p$;
  END IF;
END $$;