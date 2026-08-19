ALTER TABLE render_runs
  ADD COLUMN IF NOT EXISTS processing_stage text NOT NULL DEFAULT 'preparing';

UPDATE render_runs
SET processing_stage = CASE
  WHEN status = 'completed' THEN 'ready'
  WHEN status = 'failed' THEN 'failed'
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'cancelling' THEN 'cancelling'
  WHEN provider_request_id IS NOT NULL THEN 'rendering'
  ELSE 'preparing'
END
WHERE processing_stage = 'preparing';

DO $checks$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'render_runs_processing_stage_valid'
  ) THEN
    ALTER TABLE render_runs
      ADD CONSTRAINT render_runs_processing_stage_valid
      CHECK (processing_stage IN (
        'preparing',
        'rendering',
        'securing_output',
        'quality_review',
        'ready',
        'cancelling',
        'failed',
        'cancelled'
      ));
  END IF;
END
$checks$;

