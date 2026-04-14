import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectLabel } from "@radix-ui/react-select";

const MODEL_GROUPS = [
  {
    label: "Runway",
    models: [{ value: "runway", label: "Gen-3 Alpha" }],
  },
  {
    label: "Kuaishou (Kling)",
    models: [
      { value: "kling-1.0", label: "Kling 1.0" },
      { value: "kling-1.5", label: "Kling 1.5" },
      { value: "kling-1.6", label: "Kling 1.6" },
      { value: "kling-2.0", label: "Kling 2.0" },
      { value: "kling-3.0", label: "Kling 3.0" },
    ],
  },
  {
    label: "Google",
    models: [{ value: "veo", label: "Veo 3" }],
  },
  {
    label: "OpenAI",
    models: [{ value: "sora", label: "Sora" }],
  },
  {
    label: "Luma Labs",
    models: [{ value: "luma", label: "Dream Machine" }],
  },
  {
    label: "Pika",
    models: [{ value: "pika", label: "Pika 2.0" }],
  },
  {
    label: "MiniMax",
    models: [{ value: "hailuo", label: "Hailuo" }],
  },
  {
    label: "ByteDance",
    models: [{ value: "seedance", label: "Seedance" }],
  },
  {
    label: "Stability AI",
    models: [{ value: "stable-video", label: "Stable Video Diffusion" }],
  },
  {
    label: "Genmo",
    models: [{ value: "genmo", label: "Mochi" }],
  },
  {
    label: "PixVerse",
    models: [{ value: "pixverse", label: "PixVerse" }],
  },
  {
    label: "Haiper",
    models: [{ value: "haiper", label: "Haiper 2.0" }],
  },
  {
    label: "Vidu",
    models: [{ value: "vidu", label: "Vidu" }],
  },
  {
    label: "Zhipu AI",
    models: [{ value: "cogvideo", label: "CogVideoX" }],
  },
  {
    label: "Alibaba",
    models: [{ value: "wan", label: "Wan 2.1" }],
  },
];

interface ConfigPanelProps {
  description: string;
  model: string;
  onDescriptionChange: (v: string) => void;
  onModelChange: (v: string) => void;
}

export const ConfigPanel = ({ description, model, onDescriptionChange, onModelChange }: ConfigPanelProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Describe Your Vision (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe your vision... e.g. 'dramatic slow-motion with rain and neon lights'"
          className="bg-secondary border-border resize-none min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Target AI Model</Label>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Choose a model..." />
          </SelectTrigger>
          <SelectContent className="max-h-80">
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
