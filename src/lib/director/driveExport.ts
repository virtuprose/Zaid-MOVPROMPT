import { supabase } from "@/integrations/supabase/client";

export type DriveExportResult = {
  folder: { id: string; name: string; url: string };
  uploaded_count: number;
  failed_count: number;
  failed: { shotId: string; error: string }[];
};

export async function exportPlanToDrive(sessionId: string): Promise<DriveExportResult> {
  const { data, error } = await supabase.functions.invoke<DriveExportResult>(
    "director-export-drive",
    { body: { session_id: sessionId } },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empty response from export function");
  return data;
}
