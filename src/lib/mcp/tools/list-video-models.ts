import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MODEL_CATALOG } from "../../../../supabase/functions/_shared/videoModelCatalog";

export default defineTool({
  name: "list_video_models",
  title: "List video models",
  description:
    "Lists the video generation models MovPrompt can target (Veo, Kling, Seedance, Hailuo, Runway, LTX, etc.), optionally filtered by family.",
  inputSchema: {
    family: z
      .string()
      .optional()
      .describe("Optional family filter, e.g. 'veo', 'kling', 'seedance', 'hailuo', 'runway'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ family }) => {
    const fam = family?.trim().toLowerCase();
    const rows = MODEL_CATALOG.filter((m) => !fam || m.family.toLowerCase() === fam).map((m) => ({
      id: m.id,
      family: m.family,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { models: rows },
    };
  },
});
