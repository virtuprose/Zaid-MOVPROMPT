ALTER TABLE creator_projects
  ADD COLUMN client_draft_id uuid;

ALTER TABLE creator_project_versions
  ADD COLUMN operation_key text;

CREATE UNIQUE INDEX creator_projects_user_draft_unique
  ON creator_projects (user_id, client_draft_id)
  WHERE client_draft_id IS NOT NULL;

CREATE UNIQUE INDEX creator_versions_user_project_operation_unique
  ON creator_project_versions (user_id, project_id, operation_key)
  WHERE operation_key IS NOT NULL;

-- Runtime roles are separated so an authenticated API request cannot use the
-- worker's broad service permissions. Role creation is intentionally local
-- bootstrap/IaC responsibility; this migration grants them when present.
DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_api') THEN
    GRANT USAGE ON SCHEMA public TO movprompt_api;
    GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, accounts, verifications TO movprompt_api;
    GRANT SELECT ON video_templates, video_template_versions TO movprompt_api;
    GRANT SELECT, INSERT, UPDATE ON
      creator_projects,
      creator_project_versions,
      creator_project_assets,
      generation_quotes,
      render_runs,
      entitlements,
      credit_accounts,
      credit_reservations,
      credit_ledger,
      exports,
      notifications,
      outbox_jobs
    TO movprompt_api;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'movprompt_worker') THEN
    GRANT USAGE ON SCHEMA public TO movprompt_worker;
    GRANT SELECT, INSERT, UPDATE ON
      creator_projects,
      creator_project_versions,
      creator_project_assets,
      generation_quotes,
      render_runs,
      entitlements,
      credit_accounts,
      credit_reservations,
      credit_ledger,
      exports,
      notifications,
      outbox_jobs
    TO movprompt_worker;
  END IF;
END
$roles$;

-- Two development recipes make the first product and service golden paths
-- testable. They are explicitly marked as development recipes; launch QA must
-- replace their media with unique, reviewed outputs before promotion.
INSERT INTO video_templates (id, slug, category, publishing_state)
VALUES
  ('luxury-product-reveal', 'luxury-product-reveal', 'retail', 'published'),
  ('salon-booking-offer', 'salon-booking-offer', 'salon', 'published')
ON CONFLICT (id) DO NOTHING;

INSERT INTO video_template_versions (
  id,
  template_id,
  version_number,
  localized_name,
  localized_description,
  recipe_json,
  input_schema,
  edit_schema,
  supported_languages,
  supported_ratios,
  supported_markets,
  duration_seconds,
  published_at
)
VALUES
  (
    '10000000-0000-4000-8000-000000000101',
    'luxury-product-reveal',
    1,
    '{"en":"Luxury product reveal","ar":"عرض منتج فاخر"}'::jsonb,
    '{"en":"A refined product-first reveal for premium retail.","ar":"عرض أنيق يضع المنتج الفاخر في الواجهة."}'::jsonb,
    '{
      "qualityStatus":"development",
      "verticals":["retail","ecommerce"],
      "goals":["launch","demonstration"],
      "outcome":"Make one product feel unmistakably premium",
      "requiredInputs":["product_image","product_name"],
      "starterRenderEligible":true,
      "scenes":[
        {"id":"reveal-1","title":"The reveal","purpose":"Stop the scroll","duration":2,"headline":"Made to be noticed","direction":"Reveal the confirmed product from shadow with a precise push-in."},
        {"id":"reveal-2","title":"Material detail","purpose":"Build desire","duration":2,"headline":"Every detail matters","direction":"Show verified surface and packaging details without changing the label."},
        {"id":"reveal-3","title":"Hero moment","purpose":"Make it memorable","duration":2,"headline":"Your new essential","direction":"Hold a clean product hero with safe negative space."},
        {"id":"reveal-4","title":"Brand close","purpose":"Drive action","duration":2,"headline":"Shop now","direction":"Finish with deterministic logo, price and call to action layers."}
      ]
    }'::jsonb,
    '{"required":["source","confirmedFacts","campaign"],"presenterModes":["none","ai_ugc","uploaded_spokesperson","digital_twin"]}'::jsonb,
    '{"deterministic":["headline","price","offer","cta","logo","brandColor","subtitles","audio","sceneOrder","timing","crop"]}'::jsonb,
    ARRAY['en','ar','bilingual'],
    ARRAY['9:16','1:1','4:5','16:9'],
    ARRAY['KW'],
    8,
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000102',
    'salon-booking-offer',
    1,
    '{"en":"Salon booking offer","ar":"عرض حجز الصالون"}'::jsonb,
    '{"en":"A fact-safe booking campaign for a salon service or offer.","ar":"حملة حجز موثوقة لخدمة أو عرض صالون."}'::jsonb,
    '{
      "qualityStatus":"development",
      "verticals":["salon"],
      "goals":["bookings","offer"],
      "outcome":"Turn interest into a WhatsApp or booking action",
      "requiredInputs":["business_name","service_name","location","booking_destination"],
      "starterRenderEligible":true,
      "scenes":[
        {"id":"salon-1","title":"Service hook","purpose":"Create relevance","duration":3,"headline":"Your next appointment","direction":"Introduce only the confirmed salon service and real location context."},
        {"id":"salon-2","title":"Experience","purpose":"Build confidence","duration":4,"headline":"Made around you","direction":"Use consented real footage or an approved presenter; never fabricate a transformation."},
        {"id":"salon-3","title":"Offer","purpose":"Clarify value","duration":3,"headline":"Book your visit","direction":"Show the user-confirmed price or offer as a deterministic layer."},
        {"id":"salon-4","title":"Booking close","purpose":"Drive action","duration":2,"headline":"Book on WhatsApp","direction":"Finish with verified contact details, logo and booking call to action."}
      ]
    }'::jsonb,
    '{"required":["source","confirmedFacts","campaign"],"presenterModes":["none","ai_ugc","uploaded_spokesperson","digital_twin"]}'::jsonb,
    '{"deterministic":["headline","price","offer","cta","logo","brandColor","subtitles","audio","sceneOrder","timing","crop"]}'::jsonb,
    ARRAY['en','ar','bilingual'],
    ARRAY['9:16','1:1','4:5','16:9'],
    ARRAY['KW'],
    12,
    now()
  )
ON CONFLICT (id) DO NOTHING;

UPDATE video_templates
SET current_published_version_id = CASE id
  WHEN 'luxury-product-reveal' THEN '10000000-0000-4000-8000-000000000101'::uuid
  WHEN 'salon-booking-offer' THEN '20000000-0000-4000-8000-000000000102'::uuid
END,
updated_at = now()
WHERE id IN ('luxury-product-reveal', 'salon-booking-offer');
