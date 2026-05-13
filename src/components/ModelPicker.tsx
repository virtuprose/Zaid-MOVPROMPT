import { useEffect, useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectLabel } from "@radix-ui/react-select";
import { Label } from "@/components/ui/label";
import { MODEL_GROUPS } from "@/lib/models";
import { getContract } from "@/lib/modelContracts";
import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  model: string;
  onModelChange: (v: string) => void;
}

interface ModelRowProps {
  value: string;
  label: string;
  description: string;
  isAny?: boolean;
}

const ModelRow = ({ value, label, description, isAny }: ModelRowProps) => (
  <SelectItem
    value={value}
    className="items-start py-3 ps-7 pe-5 min-h-[3.25rem] data-[state=checked]:border-l-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[highlighted]:[&_*]:text-inherit [&>span:last-child]:block [&>span:last-child]:w-full [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
  >
    <div className="flex flex-col gap-0.5 w-full min-w-0 pe-1">
      <span className={`block w-full break-words ${isAny ? "font-semibold" : "font-medium"}`}>{label}</span>
      <span className="block w-full text-[11px] sm:text-xs text-muted-foreground whitespace-normal break-words leading-snug">
        {description}
      </span>
    </div>
  </SelectItem>
);

export const ModelPicker = ({ model, onModelChange }: ModelPickerProps) => {
  const { t } = useLanguage();
  const contract = getContract(model);
  const variantDesc = contract.variantDescKey ? t(contract.variantDescKey as any) : null;
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 200);
    return () => clearTimeout(id);
  }, [model]);

  return (
    <div data-tour="model-picker" className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 sm:p-5 space-y-2.5 sm:space-y-3 shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles className={cn("w-4 h-4 text-muted-foreground", flash && "animate-pulse")} />
        <Label className="text-sm font-medium font-display">{t("modelPicker.title" as any)}</Label>
      </div>
      <Select value={model} onValueChange={onModelChange}>
        <SelectTrigger
          className={cn(
            "bg-secondary border-border min-h-[4rem] sm:min-h-[3.75rem] h-auto py-3 px-3.5 sm:py-2.5 text-base font-display text-start [&>span]:line-clamp-none [&>span]:w-full transition-shadow",
            flash && "ring-2 ring-primary/40"
          )}
        >
          <SelectValue placeholder={t("config.chooseModel")} />
        </SelectTrigger>
        <SelectContent
          side="bottom"
          align="start"
          collisionPadding={12}
          className="model-picker-content w-[min(32rem,calc(100vw-1.5rem))] sm:w-[32rem] max-w-[calc(100vw-1.5rem)] overscroll-contain"
          style={{
            zIndex: 1000,
            maxHeight: 360,
            overflowY: "auto",
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
            scrollbarColor: "hsl(var(--muted-foreground) / 0.3) transparent",
            scrollbarWidth: "thin",
          }}
        >
          <ModelRow
            value="any"
            label={t("config.anyModel")}
            description={t("models.desc.any" as any)}
            isAny
          />
          <SelectSeparator />
          {MODEL_GROUPS.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel className="sticky top-0 z-10 px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-popover/95 backdrop-blur shadow-[0_1px_0_hsl(var(--border))]">
                {group.label}
              </SelectLabel>
              {group.models.map((m) => (
                <ModelRow
                  key={m.value}
                  value={m.value}
                  label={m.label}
                  description={t(m.descriptionKey as any)}
                />
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {variantDesc && (
        <p className="text-xs text-muted-foreground/80 italic">{variantDesc}</p>
      )}
    </div>
  );
};
