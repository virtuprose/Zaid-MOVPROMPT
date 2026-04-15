import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectLabel } from "@radix-ui/react-select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ChevronRight, ChevronDown } from "lucide-react";

const PRESET_GROUPS = [
  {
    label: "Basic Camera Control",
    icon: "🎥",
    chips: [
      "General", "Static", "Handheld", "Dolly In", "Dolly Out",
      "Pan Left", "Pan Right", "Tilt Up", "Tilt Down",
      "Zoom In", "Zoom Out", "Tracking Shot", "Push In", "Pull Out",
    ],
  },
  {
    label: "Epic Camera Control",
    icon: "🎬",
    chips: [
      "Dolly Zoom", "Dolly Zoom In", "Dolly Zoom Out", "Crash Zoom In", "Crash Zoom Out",
      "Arc Left", "Arc Right", "Crane Up", "Crane Down",
      "FPV Drone", "Orbit Left", "Orbit Right", "360 Orbit",
      "Whip Pan Left", "Whip Pan Right", "Rack Focus",
      "Bullet Time", "Steadicam", "Dutch Angle",
      "Bird's Eye", "Worm's Eye", "Jib Up", "Jib Down",
    ],
  },
  {
    label: "Effects",
    icon: "✨",
    chips: [
      "Flood", "Freezing", "Melting", "Burning", "Explosion",
      "Diamond", "Crystal", "Gold", "Silver", "Bronze",
      "Disintegration", "Pixelation", "Glitch", "Hologram",
      "Thunder God", "Lightning", "Electric", "Plasma",
      "Levitation", "Gravity Pull", "Anti-Gravity", "Floating",
      "Ink Spread", "Watercolor", "Oil Paint", "Sketch",
      "Smoke", "Fog", "Mist", "Dust",
      "Bloom", "Lens Flare", "Light Leak", "Prism",
      "Time Freeze", "Slow Motion", "Speed Ramp", "Reverse",
      "Portal", "Teleport", "Morph",
    ],
  },
  {
    label: "Catch the Pulse",
    icon: "🔥",
    chips: [
      "Paparazzi", "Rap Flex", "Catwalk", "Boxing", "Car Chasing",
      "Glam", "Agent Reveal", "Hero Landing", "Villain Entrance",
      "Dance Battle", "Concert Stage", "Street Style",
      "Martial Arts", "Surfing", "Skateboarding",
      "Fashion Reveal", "Red Carpet",
    ],
  },
  {
    label: "Mix",
    icon: "🎭",
    chips: [
      "Thunder God x Levitation", "Action Run x Set on Fire",
      "Disintegration x Levitation", "Freezing x Explosion",
      "Diamond x Lightning", "Glitch x Hologram",
      "Smoke x Light Leak", "Crystal x Prism",
      "Ink Spread x Morph", "Bullet Time x Slow Motion",
      "FPV Drone x Speed Ramp", "Dutch Angle x Glitch",
      "Paparazzi x Glam",
    ],
  },
];

const MODEL_GROUPS = [
  {
    label: "Minimax Hailuo",
    models: [
      { value: "hailuo-2.3-fast", label: "Hailuo 2.3 Fast" },
      { value: "hailuo-2.3", label: "Hailuo 2.3" },
      { value: "hailuo-02-fast", label: "Hailuo 02 Fast" },
      { value: "hailuo-02", label: "Hailuo 02" },
    ],
  },
  {
    label: "Kuaishou (Kling)",
    models: [
      { value: "kling-3.0", label: "Kling 3.0" },
      { value: "kling-3.0-omni", label: "Kling 3.0 Omni" },
      { value: "kling-3.0-omni-edit", label: "Kling 3.0 Omni Edit" },
      { value: "kling-2.6", label: "Kling 2.6" },
      { value: "kling-o1-video", label: "Kling O1 Video" },
      { value: "kling-o1-video-edit", label: "Kling O1 Video Edit" },
      { value: "kling-motion-control", label: "Kling Motion Control" },
      { value: "kling-3.0-motion-control", label: "Kling 3.0 Motion Control" },
    ],
  },
  {
    label: "OpenAI",
    models: [
      { value: "sora-2", label: "Sora 2" },
      { value: "sora-2-pro", label: "Sora 2 Pro" },
      { value: "sora-2-max", label: "Sora 2 Max" },
      { value: "sora-2-pro-max", label: "Sora 2 Pro Max" },
    ],
  },
  {
    label: "Google",
    models: [
      { value: "veo-3.1-lite", label: "Veo 3.1 Lite" },
      { value: "veo-3.1-fast", label: "Veo 3.1 Fast" },
      { value: "veo-3.1", label: "Veo 3.1" },
      { value: "veo-3-fast", label: "Veo 3 Fast" },
      { value: "veo-3", label: "Veo 3" },
    ],
  },
  {
    label: "Higgsfield",
    models: [
      { value: "higgsfield-lite", label: "Higgsfield Lite" },
      { value: "higgsfield-standard", label: "Higgsfield Standard" },
      { value: "higgsfield-turbo", label: "Higgsfield Turbo" },
    ],
  },
  {
    label: "Alibaba (Wan)",
    models: [
      { value: "wan-2.7", label: "Wan 2.7" },
      { value: "wan-2.6", label: "Wan 2.6" },
      { value: "wan-2.5", label: "Wan 2.5" },
      { value: "wan-2.5-fast", label: "Wan 2.5 Fast" },
      { value: "wan-2.2", label: "Wan 2.2" },
      { value: "wan-2.2-fast", label: "Wan 2.2 Fast" },
    ],
  },
  {
    label: "ByteDance (Seedance)",
    models: [
      { value: "seedance-2.0-fast", label: "Seedance 2.0 Fast" },
      { value: "seedance-2.0", label: "Seedance 2.0" },
      { value: "seedance-1.5-pro", label: "Seedance 1.5 Pro" },
      { value: "seedance-pro", label: "Seedance Pro" },
      { value: "seedance-pro-fast", label: "Seedance Pro Fast" },
    ],
  },
  {
    label: "xAI (Grok)",
    models: [
      { value: "grok-imagine", label: "Grok Imagine" },
      { value: "grok-imagine-edit", label: "Grok Imagine Edit" },
    ],
  },
];

interface ConfigPanelProps {
  description: string;
  model: string;
  onDescriptionChange: (v: string) => void;
  onModelChange: (v: string) => void;
}

export const ConfigPanel = ({ description, model, onDescriptionChange, onModelChange }: ConfigPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Describe Your Vision (optional)</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out overflow-hidden">
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe your vision... e.g. 'dramatic slow-motion with rain and neon lights'"
            className="bg-secondary border-border resize-none min-h-[80px]"
          />
          <Accordion type="single" collapsible className="space-y-1">
            {PRESET_GROUPS.map((group) => (
              <AccordionItem key={group.label} value={group.label} className="border-border/40 rounded-md">
                <AccordionTrigger className="py-2 px-3 text-sm hover:no-underline hover:bg-secondary/50 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{group.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                      {group.chips.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-1">
                  <div className="flex gap-1.5 flex-wrap">
                    {group.chips.map((chip) => (
                      <Badge
                        key={chip}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/20 hover:border-primary transition-colors text-xs px-2.5 py-1"
                        onClick={() => {
                          const sep = description.trim() ? ", " : "";
                          onDescriptionChange(description.trim() + sep + chip);
                        }}
                      >
                        {chip}
                      </Badge>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CollapsibleContent>
      </Collapsible>
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Target AI Model</Label>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Choose a model..." />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="any" className="font-medium">Any Model — Universal Prompt</SelectItem>
            <SelectSeparator />
            {MODEL_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </SelectLabel>
                {group.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
