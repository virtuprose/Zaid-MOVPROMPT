import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ConfigPanelProps {
  description: string;
  onDescriptionChange: (v: string) => void;
}

export const ConfigPanel = ({ description, onDescriptionChange }: ConfigPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { t } = useLanguage();

  const charCount = description.length;

  return (
    <div className="space-y-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-lg border border-border/50 bg-card/40 p-3 sm:p-4 space-y-4">
          <CollapsibleTrigger className="group w-full flex items-start justify-between gap-3 text-start hover:bg-secondary/30 -m-2 p-2 rounded-md transition-colors">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles size={16} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold font-display text-foreground">
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
                    aria-label={t("config.clear")}
                    title={t("config.clear")}
                    className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => onDescriptionChange("")}
                  >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">{t("config.clear")}</span>
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
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};
