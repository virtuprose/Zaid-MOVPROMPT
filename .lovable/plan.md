

## Add Rate Limiting to generate-prompt Edge Function

### Approach
Use an in-memory sliding window rate limiter keyed by client IP address. This is lightweight, requires no database tables, and resets on function cold starts — which is acceptable for abuse protection.

### Details

**File: `supabase/functions/generate-prompt/index.ts`**

- Add an in-memory `Map<string, number[]>` to track request timestamps per IP
- Before processing, check if the IP has exceeded **5 requests per 60 seconds**
- If exceeded, return `429 Too Many Requests` with a clear error message and `Retry-After` header
- Extract IP from `x-forwarded-for` header (standard for edge functions behind a proxy), falling back to `"unknown"`
- Clean up old timestamps on each request to prevent memory growth

### Limitations
- In-memory state resets on cold starts — this is a trade-off for simplicity
- Shared IPs (corporate NATs) may hit limits faster
- For persistent rate limiting, a database counter table would be needed (not proposed here to keep it simple)

### Config
- **Window**: 60 seconds
- **Max requests**: 5 per window per IP

Single file change, ~25 lines added at the top of the request handler.

