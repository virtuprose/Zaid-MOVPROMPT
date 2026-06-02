// Director plan stitching — reuses the existing `story-stitch` edge function
// (originally built for the 4-act story flow) in generic `job_ids` mode to
// concat N completed Director shots into one MP4 via fal's ffmpeg compose.
import { supabase } from "@/integrations/supabase/client";

export type StitchResult = {
  job_id: string;
  video_url: string;
  status: string;
};

export async function stitchPlanShots(args: {
  sessionId: string;
  jobIds: string[];
  durations: number[];
  title?: string;
}): Promise<StitchResult> {
  const { data, error } = await supabase.functions.invoke("story-stitch", {
    body: {
      session_id: args.sessionId,
      job_ids: args.jobIds,
      durations: args.durations,
      title: args.title,
    },
  });
  if (error) throw new Error(error.message || "Stitch failed");
  if (!data || typeof (data as { video_url?: unknown }).video_url !== "string") {
    throw new Error("Stitch returned no video");
  }
  return data as StitchResult;
}
