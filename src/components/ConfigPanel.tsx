import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const PRESET_GROUPS = [
  {
    label: "Basic Camera Control",
    icon: "🎥",
    description: "Simple camera movements like panning, tilting, and zooming",
    chips: [
      "General", "Static", "No Movement", "Natural Movement", "Shake",
      "Handheld", "Dolly In", "Dolly Out",
      "Pan Left", "Pan Right", "Tilt Up", "Tilt Down",
      "Zoom In", "Zoom Out", "Snap Zoom",
      "Tracking Shot", "Follow", "Push In", "Pull Out",
      "Pedestal Up", "Pedestal Down", "Swivel", "Drift", "Reveal",
    ],
  },
  {
    label: "Epic Camera Control",
    icon: "🎬",
    description: "Advanced cinematic shots: crane, orbit, drone, and dramatic angles",
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
    description: "Visual transformations: materials, weather, artistic styles, and motion effects",
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
    description: "Action and lifestyle scenes: fashion, sports, stage moments",
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
    description: "Two effects combined for unique cinematic results",
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

interface ConfigPanelProps {
  description: string;
  onDescriptionChange: (v: string) => void;
}

export const ConfigPanel = ({ description, onDescriptionChange }: ConfigPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>{t("config.describeVision")}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out overflow-hidden">
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("config.placeholder")}
            className="bg-secondary border-border resize-none min-h-[80px]"
          />
          <Accordion type="single" collapsible className="space-y-1">
            {PRESET_GROUPS.map((group) => (
              <AccordionItem key={group.label} value={group.label} className="border-border/40 rounded-md">
                <AccordionTrigger className="py-2 px-3 text-sm hover:no-underline hover:bg-secondary/50 rounded-md transition-colors">
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{group.label}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                        {group.chips.length}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 font-normal">{group.description}</span>
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
    </div>
  );
};
