import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SelectLabel } from "@radix-ui/react-select";

const CINEMATIC_STYLES = [
  "Film Noir", "Cyberpunk", "Magical Realism", "35mm Film", "Anamorphic",
  "Documentary", "Sci-Fi Epic", "Horror", "Golden Hour", "Noir Thriller",
  "Vintage 8mm", "IMAX", "Music Video", "Commercial",
];

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
  style: string;
  model: string;
  onStyleChange: (v: string) => void;
  onModelChange: (v: string) => void;
}

export const ConfigPanel = ({ style, model, onStyleChange, onModelChange }: ConfigPanelProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Cinematic Style</Label>
        <Select value={style} onValueChange={onStyleChange}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Choose a style..." />
          </SelectTrigger>
          <SelectContent>
            {CINEMATIC_STYLES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
