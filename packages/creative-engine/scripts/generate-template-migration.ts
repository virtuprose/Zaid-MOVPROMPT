import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { CREATIVE_TEMPLATE_CATALOG } from "../src/catalog.js";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function sqlArray(values: readonly string[]): string {
  return `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;
}

function stableUuid(value: string): string {
  const hex = createHash("md5").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const templateRows = CREATIVE_TEMPLATE_CATALOG.map((template) =>
  `  (${sqlString(template.id)}, ${sqlString(template.slug)}, ${sqlString(template.category)}, 'published')`,
).join(",\n");

const versionRows = CREATIVE_TEMPLATE_CATALOG.map((template) => {
  const versionId = stableUuid(`movprompt-template:${template.id}:v${template.versionNumber}`);
  const recipe = {
    outcome: template.outcome,
    verticals: template.verticals,
    goals: template.goals,
    requiredInputs: template.requiredInputs,
    starterRenderEligible: template.starterRenderEligible,
    qualityStatus: template.qualityStatus,
    storyArc: template.storyArc,
    tone: template.tone,
    dialectPolicy: {
      arabicDialect: "kuwaiti",
      locale: "ar-KW",
      register: template.dialectRegister,
      crossDialectFallback: false,
    },
    visualSystem: template.visualSystem,
    soundDirection: template.soundDirection,
    capabilityPolicy: template.capabilityPolicy,
    protectedLayers: template.protectedLayers,
    complianceRules: template.complianceRules,
    qualityPolicy: template.qualityPolicy,
    tags: template.tags,
    scenes: template.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title.en,
      purpose: scene.purpose.en,
      duration: scene.duration,
      headline: scene.headline.en,
      direction: scene.direction,
    })),
    sceneRecipe: template.scenes,
  };
  const inputSchema = {
    type: "object",
    required: template.requiredInputs,
    properties: Object.fromEntries(template.requiredInputs.map((field) => [field, { type: "string" }])),
  };
  const editSchema = {
    deterministic: ["headline", "price", "offer", "cta", "logo", "brand_color", "subtitles", "audio", "scene_order", "timing", "crop"],
    generative: ["visual_direction", "camera", "lighting", "motion", "setting"],
  };
  return `  (${sqlString(versionId)}::uuid, ${sqlString(template.id)}, ${template.versionNumber}, ${sqlJson(template.localizedName)}, ${sqlJson(template.localizedDescription)}, ${sqlJson(recipe)}, ${sqlJson(inputSchema)}, ${sqlJson(editSchema)}, ${sqlArray(template.supportedLanguages)}, ${sqlArray(template.supportedRatios)}, ${sqlArray(template.supportedMarkets)}, ${template.durationSeconds}, now())`;
}).join(",\n");

const pointerRows = CREATIVE_TEMPLATE_CATALOG.map((template) =>
  `  (${sqlString(template.id)}, ${sqlString(stableUuid(`movprompt-template:${template.id}:v${template.versionNumber}`))}::uuid)`,
).join(",\n");

const sql = `-- Generated from @movprompt/creative-engine. Do not edit recipe rows by hand.\n\nINSERT INTO video_templates (id, slug, category, publishing_state)\nVALUES\n${templateRows}\nON CONFLICT (id) DO UPDATE SET\n  slug = EXCLUDED.slug,\n  category = EXCLUDED.category,\n  publishing_state = 'published',\n  updated_at = now();\n\nINSERT INTO video_template_versions (\n  id, template_id, version_number, localized_name, localized_description, recipe_json,\n  input_schema, edit_schema, supported_languages, supported_ratios, supported_markets,\n  duration_seconds, published_at\n)\nVALUES\n${versionRows}\nON CONFLICT (template_id, version_number) DO NOTHING;\n\nUPDATE video_templates AS template\nSET current_published_version_id = pointer.version_id, updated_at = now()\nFROM (VALUES\n${pointerRows}\n) AS pointer(template_id, version_id)\nWHERE template.id = pointer.template_id\n  AND EXISTS (SELECT 1 FROM video_template_versions version WHERE version.id = pointer.version_id);\n`;

const target = resolve(process.cwd(), "packages/db/migrations/0007_kuwait_campaign_catalog.sql");
await writeFile(target, sql, "utf8");
console.log(`wrote ${target} (${CREATIVE_TEMPLATE_CATALOG.length} templates)`);
