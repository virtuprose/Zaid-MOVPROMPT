UPDATE "video_template_versions"
SET "recipe_json" = jsonb_set(
  "recipe_json",
  '{qualityPolicy,scoredDimensions}',
  COALESCE("recipe_json" #> '{qualityPolicy,scoredDimensions}', '[]'::jsonb) || '["speech_sync"]'::jsonb,
  true
)
WHERE NOT (COALESCE("recipe_json" #> '{qualityPolicy,scoredDimensions}', '[]'::jsonb) ? 'speech_sync');
