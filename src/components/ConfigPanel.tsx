import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectLabel } from "@radix-ui/react-select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown } from "lucide-react";

const PRESET_GROUPS = [
  {
    label: "🎥 Camera",
    chips: ["Slow motion", "Drone shot", "Dolly zoom", "Handheld", "Tracking shot", "Crane shot", "Steadicam", "POV shot", "Whip pan", "Timelapse", "Arc shot", "Push in", "Pull out", "Orbit", "Static lock", "Rack focus", "Dutch angle", "Bird's eye", "Worm's eye", "Zoom in", "Jib down", "Jib up", "Dolly left", "Dolly right", "Dolly out", "Dolly in", "False POV"],
  },
  {
    label: "✨ Transitions",
    chips: ["Fade in", "Fade out", "Cross dissolve", "Morph cut", "Zoom transition", "Swipe cut", "Match cut", "Jump cut", "Smash cut", "Iris wipe", "Light leak", "Glitch", "Speed ramp", "Flash cut", "Whip transition", "Parallax shift"],
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
        <CollapsibleContent className="pt-2 space-y-2 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out overflow-hidden">
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe your vision... e.g. 'dramatic slow-motion with rain and neon lights'"
            className="bg-secondary border-border resize-none min-h-[80px]"
          />
          <div className="space-y-3">
            {PRESET_GROUPS.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground/70">{group.label}</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible sm:pb-0">
                  {group.chips.map((chip) => (
                    <Badge
                      key={chip}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/20 hover:border-primary transition-colors text-xs px-2.5 py-1"
                      onClick={() => {
                        const sep = description.trim() ? ", " : "";
                        onDescriptionChange(description.trim() + sep + chip.toLowerCase());
                      }}
                    >
                      {chip}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
