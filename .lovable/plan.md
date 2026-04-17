

User wants to seed agent_profiles rows with the in-code defaults from the 4 agent files. I have all 4 file contents already in context. This is a simple data INSERT (with ON CONFLICT update) — needs a migration since current rows may exist as empty stubs or not exist at all. Let me check current state quickly... actually I'll just use INSERT ... ON CONFLICT (agent_id) DO UPDATE in a migration. But agent_id needs a unique constraint — let me check schema. Looking at table: agent_id is text, NOT NULL, but no unique constraint shown. I'll need to add one if missing, or use a different upsert pattern.

Plan: short and clear.

