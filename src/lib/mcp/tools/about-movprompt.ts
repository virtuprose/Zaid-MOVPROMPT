import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "about_movprompt",
  title: "About MovPrompt",
  description:
    "Describes what MovPrompt is, its three workflows (Single Frame, Two Frames, Multi-Shot Storyboard), and the video model families it supports.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const text = [
      "MovPrompt — AI Director of Photography for generative video prompts.",
      "",
      "Workflows:",
      "1. Single Frame — analyze one image and produce a director-grade video prompt (camera, lighting, mood, negative prompt).",
      "2. Two Frames — start + end frame become a smooth two-frame motion story.",
      "3. Multi-Shot Storyboard — 3/6/9-shot cinematic sequence with shared style and edit grammar.",
      "",
      "Supported target models: Veo, Kling, Runway, Seedance, Sora, Hailuo, Wan, Pika, LTX.",
      "",
      "Site: https://movprompt.com",
    ].join("\n");
    return { content: [{ type: "text", text }] };
  },
});
