import { defineMcp } from "@lovable.dev/mcp-js";
import aboutMovprompt from "./tools/about-movprompt";
import listVideoModels from "./tools/list-video-models";

export default defineMcp({
  name: "movprompt-mcp",
  title: "MovPrompt MCP",
  version: "0.1.0",
  instructions:
    "MovPrompt exposes cinematic video prompt tooling. Use `about_movprompt` for an overview and `list_video_models` to see supported target video models (optionally filter by family).",
  tools: [aboutMovprompt, listVideoModels],
});
