-- Every account needs a credit balance row, even when its balance is zero.
-- Existing values are never reset by this idempotent backfill.
INSERT INTO credit_accounts (user_id)
SELECT id
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- One curated starter render is an entitlement, not general credits. Only
-- verified users receive it, and replaying this migration cannot resurrect a
-- previously reserved or consumed entitlement because (user_id, type) is
-- unique and conflicts are ignored.
INSERT INTO entitlements (user_id, entitlement_type, status)
SELECT id, 'starter_template_render', 'available'
FROM users
WHERE email_verified IS TRUE
ON CONFLICT (user_id, entitlement_type) DO NOTHING;
