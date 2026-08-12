-- GCC launch catalog expansion. Recipes remain immutable through version rows.
WITH catalog(id, category, en_name, ar_name, en_description, ar_description, duration_seconds, preview_path, poster_path) AS (
  VALUES
    ('ugc-review','ugc','UGC review','مراجعة صانع محتوى','A credible first-person product review.','مراجعة واقعية للمنتج بصوت صانع محتوى.',12,'presets/talking-avatar.mp4','homepage/hero-creator.png'),
    ('unboxing','product','Premium unboxing','فتح صندوق فاخر','A clean packaging and first-use story.','قصة راقية لفتح العبوة وتجربة المنتج.',10,'presets/tactile-stopmotion.mp4','homepage/template-texture-study.png'),
    ('whatsapp-sales-ad','offer','WhatsApp sales ad','إعلان مبيعات واتساب','A bilingual direct-response sales format.','إعلان ثنائي اللغة مصمم لطلبات واتساب.',8,'presets/speed-reveal.mp4','homepage/template-launch-story.png'),
    ('food-beverage','food','Food & beverage craving','إعلان طعام ومشروبات','A sensory freshness and serving story.','قصة حسية تبرز الطزاجة والتقديم.',8,'presets/lifestyle.mp4','homepage/template-in-motion.png'),
    ('beauty-perfume','beauty','Beauty & perfume ritual','طقوس الجمال والعطور','A sensorial beauty and fragrance story.','قصة حسية للجمال والعطور.',8,'presets/elite.mp4','homepage/template-product-reveal.png'),
    ('fashion','fashion','Fashion drop','إطلاق مجموعة أزياء','An editorial collection launch.','إطلاق تحريري لمجموعة أزياء.',10,'presets/cinematic-fashion.mp4','homepage/hero-lifestyle.png'),
    ('electronics','electronics','Electronics feature demo','عرض ميزة إلكترونية','A precise technology feature demonstration.','عرض دقيق لميزة تقنية.',10,'presets/realistic-3d.mp4','homepage/template-clean-demo.png'),
    ('ramadan-eid','seasonal','Ramadan & Eid campaign','حملة رمضان والعيد','A respectful bilingual seasonal campaign.','حملة موسمية ثنائية اللغة بطابع خليجي.',10,'presets/fashion-dream.mp4','homepage/hero-product.png'),
    ('app-service','app','App & service promotion','ترويج تطبيق أو خدمة','A benefit-first app or service promotion.','ترويج واضح لتطبيق أو خدمة يركز على الفائدة.',12,'presets/cinematic-ai-director.mp4','homepage/template-clean-demo.png')
), templates AS (
  INSERT INTO public.video_templates(id,slug,category,publishing_state)
  SELECT id,id,category,'published' FROM catalog ON CONFLICT (id) DO UPDATE SET category = excluded.category, publishing_state = 'published'
  RETURNING id
), versions AS (
  INSERT INTO public.video_template_versions(template_id,version_number,localized_name,localized_description,recipe_json,input_schema,edit_schema,supported_languages,supported_ratios,supported_markets,duration_seconds,preview_storage_path,poster_storage_path,published_at)
  SELECT id,1,jsonb_build_object('en',en_name,'ar',ar_name),jsonb_build_object('en',en_description,'ar',ar_description),jsonb_build_object('capability','video.seedance.latest','catalog_recipe',id),'{"product_images":{"min":1,"max":5}}'::jsonb,'{"copy":true,"logo":true,"subtitles":true,"scene_order":true,"export":true}'::jsonb,ARRAY['en','ar','bilingual'],ARRAY['9:16','1:1','4:5','16:9'],ARRAY['KW','SA','AE','QA','BH','OM'],duration_seconds,preview_path,poster_path,now() FROM catalog
  ON CONFLICT (template_id,version_number) DO UPDATE SET localized_name=excluded.localized_name, localized_description=excluded.localized_description, recipe_json=excluded.recipe_json, input_schema=excluded.input_schema, edit_schema=excluded.edit_schema, supported_languages=excluded.supported_languages, supported_ratios=excluded.supported_ratios, supported_markets=excluded.supported_markets, duration_seconds=excluded.duration_seconds, preview_storage_path=excluded.preview_storage_path, poster_storage_path=excluded.poster_storage_path, published_at=excluded.published_at
  RETURNING id,template_id
)
UPDATE public.video_templates template SET current_published_version_id = version.id FROM versions version WHERE template.id = version.template_id;
