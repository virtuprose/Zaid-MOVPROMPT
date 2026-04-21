import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Search, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { PRESET_GROUPS, type PresetGroupId, type Preset, useAllPresets } from "@/lib/presets";
import { PresetCard } from "@/components/PresetCard";

interface ConfigPanelProps {
  description: string;
  onDescriptionChange: (v: string) => void;
}

const isPresetSelected = (description: string, label: string) => {
  const tokens = description.split(",").map((t) => t.trim().toLowerCase());
  return tokens.includes(label.toLowerCase());
};

export const ConfigPanel = ({ description, onDescriptionChange }: ConfigPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<PresetGroupId>("basic");
  const [search, setSearch] = useState("");
  const { t } = useLanguage();
  const { presets } = useAllPresets();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return presets.filter((p) => p.group === activeTab);
    return presets.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.bestFor.toLowerCase().includes(q),
    );
  }, [activeTab, search, presets]);

  const togglePreset = (preset: Preset) => {
    const tokens = description.split(",").map((t) => t.trim()).filter(Boolean);
    const idx = tokens.findIndex((t) => t.toLowerCase() === preset.label.toLowerCase());
    if (idx >= 0) {
      tokens.splice(idx, 1);
    } else {
      tokens.push(preset.label);
    }
    onDescriptionChange(tokens.join(", "));
  };

  const charCount = description.length;

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border border-border/50 bg-card/40 p-3 sm:p-4 space-y-4">
          <CollapsibleTrigger className="group w-full flex items-start justify-between gap-3 text-start hover:bg-secondary/30 -m-2 p-2 rounded-md transition-colors">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("config.describeVision")}
                </h3>
                <span className="inline-flex items-center rounded-full border border-border/60 bg-secondary/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("config.describeVision.optional")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("config.describeVisionHelper")}
              </p>
            </div>
            <ChevronDown
              size={18}
              className="text-muted-foreground mt-0.5 transition-transform group-data-[state=closed]:-rotate-90"
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out overflow-hidden">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/80">
                  {t("config.yourDescription")}
                </label>
                {charCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => onDescriptionChange("")}
                  >
                    {t("config.clear")}
                  </Button>
                )}
              </div>
              <div className="relative">
                <Textarea
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder={t("config.placeholder")}
                  className="bg-secondary border-border resize-none min-h-[100px] pb-7"
                />
                <span className="absolute bottom-2 end-3 text-[10px] text-muted-foreground/70 pointer-events-none">
                  {t("config.charsCount").replace("{n}", String(charCount))}
                </span>
              </div>
            </div>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                {t("config.augmentWithPresets")}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("presets.search.placeholder")}
                  className="ps-9 h-9 bg-secondary/60 border-border/50 text-sm"
                />
              </div>

              {search.trim() ? (
                <div>
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      {t("presets.empty")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {filtered.map((preset) => (
                        <PresetCard
                          key={preset.id}
                          preset={preset}
                          selected={isPresetSelected(description, preset.label)}
                          onToggle={togglePreset}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PresetGroupId)}>
                  <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-secondary/40 p-1">
                    {PRESET_GROUPS.map((g) => (
                      <TabsTrigger
                        key={g.id}
                        value={g.id}
                        className="text-xs gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                      >
                        <span>{g.icon}</span>
                        <span>{g.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {PRESET_GROUPS.map((g) => (
                    <TabsContent key={g.id} value={g.id} className="mt-3 space-y-2">
                      <p className="text-[11px] text-muted-foreground/70">{g.description}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {filtered.map((preset) => (
                          <PresetCard
                            key={preset.id}
                            preset={preset}
                            selected={isPresetSelected(description, preset.label)}
                            onToggle={togglePreset}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};
