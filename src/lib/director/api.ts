import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "./ingest";

export type DirectorMsg = { role: "user" | "assistant"; content: string };

export type AgentResponse =
  | { kind: "ask_clarification"; questions: string[]; reason: string }
  | {
      kind: "generate_prompt";
      title: string;
      prompt: string;
      breakdown: Record<string, string>;
      directors_note?: string;
    }
  | { kind: "video_request"; status: "coming_soon"; message: string; args: any }
  | { kind: "message"; content: string };

export async function callDirectorAgent(
  messages: DirectorMsg[],
  attachments: Attachment[],
): Promise<AgentResponse> {
  const { data, error } = await supabase.functions.invoke("director-agent", {
    body: { messages, attachments },
  });
  if (error) throw error;
  return data as AgentResponse;
}
