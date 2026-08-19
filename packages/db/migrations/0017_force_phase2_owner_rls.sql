-- Owners normally bypass row security on tables they own. The portable API's
-- restricted role must never rely on that exception, so Phase 2 owner tables
-- force their existing transaction-local user policies for every role.
ALTER TABLE creator_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE creator_project_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE creator_project_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE guest_claim_operations FORCE ROW LEVEL SECURITY;
ALTER TABLE guest_claim_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE generation_quotes FORCE ROW LEVEL SECURITY;
ALTER TABLE render_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE render_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE exports FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger FORCE ROW LEVEL SECURITY;
ALTER TABLE credit_reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
