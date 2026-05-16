update public.video_jobs
set status = 'failed',
    error = 'Provider endpoint changed — please retry',
    completed_at = now()
where status in ('queued','processing')
  and provider in ('seedance-2.0-ref','seedance-v1-pro-ref');