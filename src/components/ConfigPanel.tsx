import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const CINEMATIC_STYLES = [
  "Film Noir", "Cyberpunk", "Magical Realism", "35mm Film", "Anamorphic",
  "Documentary", "Sci-Fi Epic", "Horror", "Golden Hour", "Noir Thriller",
  "Vintage 8mm", "IMAX", "Music Video", "Commercial",
];

const TARGET_MODELS = [
  { value: "runway", label: "Runway Gen-3 Alpha" },
  { value: "kling", label: "Kling 1.5" },
  { value: "luma", label: "Luma Dream Machine" },
  { value: "veo", label: "Google Veo 3" },
  { value: "sora", label: "OpenAI Sora" },
  { value: "pika", label: "Pika 2.0" },
  { value: "hailuo", label: "Hailuo MiniMax" },
  { value: "seedance", label: "Seedance" },
  { value: "stable-video", label: "Stable Video Diffusion" },
  { value: "genmo", label: "Genmo Mochi" },
  { value: "pixverse", label: "PixVerse" },
  { value: "haiper", label: "Haiper 2.0" },
  { value: "vidu", label: "Vidu" },
  { value: "cogvideo", label: "CogVideoX" },
  { value: "wan", label: "Wan 2.1" },
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
          <SelectContent>
            {TARGET_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
