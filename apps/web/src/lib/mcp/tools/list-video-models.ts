const approvedCapabilities = [
  { alias: "video.seedance.latest", kind: "video" },
  { alias: "video.omni_flash.latest", kind: "video" },
  { alias: "image.nano_banana.latest", kind: "image" },
] as const;

const listCapabilitiesTool = {
  name: "list_approved_capabilities",
  title: "List approved capabilities",
  description:
    "Lists the stable capability aliases MovPrompt may use without exposing raw provider model IDs.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    return {
      content: [{ type: "text", text: JSON.stringify(approvedCapabilities, null, 2) }],
      structuredContent: { capabilities: approvedCapabilities },
    };
  },
};

export default listCapabilitiesTool;
