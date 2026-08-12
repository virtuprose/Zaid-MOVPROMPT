ALTER TABLE generation_quotes
  DROP CONSTRAINT IF EXISTS generation_quotes_approved_capability;

ALTER TABLE render_runs
  DROP CONSTRAINT IF EXISTS render_runs_approved_capability;

UPDATE generation_quotes SET capability_alias = CASE capability_alias
  WHEN 'video.seedance.latest' THEN 'video.cinematic'
  WHEN 'video.omni_flash.latest' THEN 'video.product_fidelity'
  WHEN 'image.nano_banana.latest' THEN 'image.product'
  ELSE capability_alias
END;

UPDATE render_runs SET capability_alias = CASE capability_alias
  WHEN 'video.seedance.latest' THEN 'video.cinematic'
  WHEN 'video.omni_flash.latest' THEN 'video.product_fidelity'
  WHEN 'image.nano_banana.latest' THEN 'image.product'
  ELSE capability_alias
END;

ALTER TABLE generation_quotes
  ADD CONSTRAINT generation_quotes_approved_capability
  CHECK (capability_alias IN (
    'video.cinematic',
    'video.product_fidelity',
    'image.product',
    'presenter.ai_ugc',
    'avatar.enroll',
    'avatar.perform',
    'voice.clone',
    'speech.generate',
    'speech.lip_sync',
    'media.transcribe',
    'media.moderate'
  ));

ALTER TABLE render_runs
  ADD CONSTRAINT render_runs_approved_capability
  CHECK (capability_alias IN (
    'video.cinematic',
    'video.product_fidelity',
    'image.product',
    'presenter.ai_ugc',
    'avatar.enroll',
    'avatar.perform',
    'voice.clone',
    'speech.generate',
    'speech.lip_sync',
    'media.transcribe',
    'media.moderate'
  ));
