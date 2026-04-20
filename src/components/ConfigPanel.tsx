import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { PRESETS, PRESET_GROUPS, type PresetGroupId, type Preset } from "@/lib/presets";
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PresetGroupId>("basic");
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PRESETS.filter((p) => p.group === activeTab);
    return PRESETS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.bestFor.toLowerCase().includes(q),
    );
  }, [activeTab, search]);

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

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>{t("config.describeVision")}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out overflow-hidden">
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("config.placeholder")}
            className="bg-secondary border-border resize-none min-h-[80px]"
          />

          <div className="rounded-lg border border-border/50 bg-card/40 p-3 space-y-3">
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
      </Collapsible>
    </div>
  );
};
