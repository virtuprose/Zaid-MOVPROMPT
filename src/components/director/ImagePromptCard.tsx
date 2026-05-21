import { useState } from "react";
import { Copy, Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ImagePromptData = {
  concept: string;
  sections: {
    subject: string;
    scene: string;
    composition: string;
    lighting: string;
    color_mood: string;
    style_refs: string;
    lens_camera: string;
    technical: string;
    negative: string;
  };
  variants: {
    midjourney: string;
    flux: string;
    sdxl: string;
    dalle: string;
    nano_banana: string;
    ideogram: string;
    universal: string;
  };
};

const SECTION_LABELS: Record<keyof ImagePromptData["sections"], string> = {
  subject: "Subject",
  scene: "Scene & Environment",
  composition: "Composition & Framing",
  lighting: "Lighting",
  color_mood: "Color & Mood",
  style_refs: "Style References",
  lens_camera: "Lens / Camera Feel",
  technical: "Technical",
  negative: "Negative Prompt",
};

const VARIANT_LABELS: Record<keyof ImagePromptData["variants"], string> = {
  universal: "Universal",
  midjourney: "Midjourney v6",
  flux: "Flux 1.1 Pro",
  sdxl: "SDXL",
  dalle: "DALL·E 3",
  nano_banana: "Nano Banana",
  ideogram: "Ideogram",
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success("Copied");
          setTimeout(() => setCopied(false), 1400);
        } catch {
          toast.error("Could not copy");
        }
      }}
      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label}
    </Button>
  );
}

export function ImagePromptCard({ data }: { data: ImagePromptData }) {
  const allText = [
    `CONCEPT: ${data.concept}`,
    ...Object.entries(data.sections).map(([k, v]) => `${SECTION_LABELS[k as keyof typeof SECTION_LABELS].toUpperCase()}: ${v}`),
    "",
    "— GENERATOR VARIANTS —",
    ...Object.entries(data.variants).map(([k, v]) => `${VARIANT_LABELS[k as keyof typeof VARIANT_LABELS]}: ${v}`),
  ].join("\n\n");

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/10 p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Image Prompt</div>
            <div className="text-sm font-medium text-foreground line-clamp-2">{data.concept}</div>
          </div>
        </div>
        <CopyButton text={allText} label="Copy all" />
      </div>

      <Tabs defaultValue="variants" className="w-full">
        <TabsList className="bg-background/40">
          <TabsTrigger value="variants">Generator prompts</TabsTrigger>
          <TabsTrigger value="sections">Structured breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="variants" className="mt-4">
          <Tabs defaultValue="universal" className="w-full">
            <TabsList className="flex flex-wrap h-auto bg-background/30">
              {(Object.keys(VARIANT_LABELS) as (keyof typeof VARIANT_LABELS)[]).map((k) => (
                <TabsTrigger key={k} value={k} className="text-xs">
                  {VARIANT_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(VARIANT_LABELS) as (keyof typeof VARIANT_LABELS)[]).map((k) => (
              <TabsContent key={k} value={k} className="mt-3">
                <div className="relative rounded-xl bg-background/40 border border-border/30 p-4">
                  <p className={cn("text-sm text-foreground/90 whitespace-pre-wrap pr-12 leading-relaxed font-mono")}>
                    {data.variants[k]}
                  </p>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={data.variants[k]} />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        <TabsContent value="sections" className="mt-4 space-y-3">
          {(Object.keys(SECTION_LABELS) as (keyof typeof SECTION_LABELS)[]).map((k) => {
            const value = data.sections[k];
            if (!value) return null;
            return (
              <div key={k} className="rounded-xl bg-background/30 border border-border/30 p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {SECTION_LABELS[k]}
                  </div>
                  <CopyButton text={value} />
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed">{value}</p>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
