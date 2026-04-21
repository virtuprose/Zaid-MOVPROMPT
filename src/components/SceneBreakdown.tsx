import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Play, Plus, X, User, Mountain, Sun, Cloud, Package, Palette, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/i18n/LanguageContext";

export interface SceneElement {
  id: string;
  category: "Subject" | "Background" | "Lighting" | "Atmosphere" | "Objects" | "Colors";
  description: string;
  details: string;
}

export interface SceneFrame {
  frameIndex: number;
  elements: SceneElement[];
}

export interface ElementDirection {
  action: "lock" | "move";
  note: string;
}

export type ElementDirections = Record<string, ElementDirection>;

interface SceneBreakdownProps {
  frames: SceneFrame[];
  frameLabels: string[];
  framePreviews: (string | null)[];
  directions: ElementDirections;
  onDirectionsChange: (directions: ElementDirections) => void;
  onInsertMention?: (n: number) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  Subject: User, Background: Mountain, Lighting: Sun, Atmosphere: Cloud, Objects: Package, Colors: Palette,
};

const categoryEmoji: Record<string, string> = {
  Subject: "🎯", Background: "🏙", Lighting: "💡", Atmosphere: "🌤", Objects: "📦", Colors: "🎨",
};

export const SceneBreakdown = ({ frames, frameLabels, framePreviews, directions, onDirectionsChange }: SceneBreakdownProps) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const toggleAction = (id: string) => {
    const current = directions[id];
    onDirectionsChange({
      ...directions,
      [id]: { ...current, action: current.action === "lock" ? "move" : "lock" },
    });
  };

  const updateNote = (id: string, note: string) => {
    onDirectionsChange({
      ...directions,
      [id]: { ...directions[id], note },
    });
  };

  const toggleNoteExpanded = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showFrameHeaders = frames.length > 1;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-display font-semibold text-foreground">{t("scene.title")}</h3>
        <span className="text-xs text-muted-foreground">{t("scene.subtitle")}</span>
      </div>

      {frames.map((frame, frameIdx) => {
        const label = frameLabels[frameIdx] || `Frame ${frameIdx + 1}`;
        const preview = framePreviews[frameIdx];

        return (
          <div key={frame.frameIndex} className="space-y-2">
            {showFrameHeaders && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: frameIdx * 0.15 }}
                className="flex items-center gap-3 pt-2 pb-1 border-b border-border/50"
              >
                {preview ? (
                  <img src={preview} alt={label} className="w-10 h-10 rounded-md object-cover border border-border/50 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Film className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <h4 className="text-xs font-display font-semibold text-primary uppercase tracking-wider">{label}</h4>
                <span className="text-xs text-muted-foreground">{frame.elements.length} {t("scene.elements")}</span>
              </motion.div>
            )}

            <div className="space-y-2">
              {frame.elements.map((el, i) => {
                const dir = directions[el.id];
                const isLocked = dir?.action === "lock";
                const noteExpanded = expandedNotes.has(el.id);
                const Icon = categoryIcons[el.category] || Package;

                return (
                  <motion.div
                    key={el.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: frameIdx * 0.15 + i * 0.08 }}
                    className={`rounded-lg border p-3 transition-colors ${isLocked ? "border-border bg-card/50 opacity-75" : "border-primary/30 bg-primary/5"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 rounded-md p-1.5 ${isLocked ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {categoryEmoji[el.category]} {el.category}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{el.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{el.details}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={isLocked ? "secondary" : "ghost"}
                          onClick={() => { if (!isLocked) toggleAction(el.id); }}
                          className={`h-7 px-2 text-xs gap-1 ${isLocked ? "bg-secondary text-secondary-foreground" : ""}`}
                        >
                          <Lock className="w-3 h-3" /> {t("scene.lock")}
                        </Button>
                        <Button
                          size="sm"
                          variant={!isLocked ? "secondary" : "ghost"}
                          onClick={() => { if (isLocked) toggleAction(el.id); }}
                          className={`h-7 px-2 text-xs gap-1 ${!isLocked ? "bg-primary/20 text-primary" : ""}`}
                        >
                          <Play className="w-3 h-3" /> {t("scene.move")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleNoteExpanded(el.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                        >
                          {noteExpanded ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>

                    {noteExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 ms-9"
                      >
                        <Textarea
                          placeholder={t("scene.notePlaceholder")}
                          value={dir?.note || ""}
                          onChange={(e) => updateNote(el.id, e.target.value)}
                          className="min-h-[60px] text-xs bg-background/50 border-border/50 resize-none"
                          maxLength={300}
                        />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};
