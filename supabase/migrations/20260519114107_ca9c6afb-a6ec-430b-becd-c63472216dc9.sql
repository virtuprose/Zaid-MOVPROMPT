
REVOKE EXECUTE ON FUNCTION public.charge_credits(uuid, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credits(uuid, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_daily_credits_if_due(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.charge_credits(uuid, integer, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, integer, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_daily_credits_if_due(uuid) TO authenticated, service_role;
