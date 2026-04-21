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
    className="py-3 px-2.5 min-h-[3.25rem] data-[state=checked]:border-l-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5"
  >
    <div className="flex flex-col gap-0.5 w-full">
      <span className={`truncate ${isAny ? "font-semibold" : "font-medium"}`}>{label}</span>
      <span className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-snug">
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
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 sm:p-5 space-y-2.5 sm:space-y-3 shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles className={cn("w-4 h-4 text-primary", flash && "animate-pulse")} />
        <Label className="text-sm font-medium font-display">{t("modelPicker.title" as any)}</Label>
      </div>
      <Select value={model} onValueChange={onModelChange}>
        <SelectTrigger
          className={cn(
            "bg-secondary border-border min-h-[4rem] sm:min-h-[3.75rem] h-auto py-3 px-3.5 sm:py-2.5 text-base text-start [&>span]:line-clamp-none [&>span]:w-full transition-shadow",
            flash && "ring-2 ring-primary/40"
          )}
        >
          <SelectValue placeholder={t("config.chooseModel")} />
        </SelectTrigger>
        <SelectContent className="max-h-[min(70vh,420px)] w-[min(22rem,calc(100vw-1.5rem))] overscroll-contain">
          <ModelRow
            value="any"
            label={t("config.anyModel")}
            description={t("models.desc.any" as any)}
            isAny
          />
          <SelectSeparator />
          {MODEL_GROUPS.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel className="sticky top-0 z-10 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-popover/95 backdrop-blur">
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
