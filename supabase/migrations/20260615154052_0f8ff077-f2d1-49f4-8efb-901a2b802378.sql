INSERT INTO public.credit_prices (key, kind, amount) VALUES
  ('storyboard_plan', 'flat', 2),
  ('image_upscale_4k', 'flat', 4),
  ('image_edit', 'flat', 6),
  ('director_chat_multimodal', 'flat', 4),
  ('story_stitch', 'flat', 8),
  ('video.seedance-2.0-ref', 'per_second', 18),
  ('video.veo-3.1', 'per_second', 42),
  ('video.veo-3.1-fast', 'per_second', 18),
  ('video.veo-3.1-lite', 'per_second', 8),
  ('video.kling-v3-4k', 'per_second', 55),
  ('video.kling-omni', 'per_second', 45),
  ('video.kling-omni-edit', 'per_second', 45),
  ('video.kling-omni-ref', 'per_second', 45),
  ('video.seedance-v1-pro-ref', 'per_second', 16),
  ('video.hailuo-02-standard', 'per_second', 7)
ON CONFLICT (key) DO UPDATE
  SET kind = EXCLUDED.kind,
      amount = EXCLUDED.amount,
      updated_at = now();