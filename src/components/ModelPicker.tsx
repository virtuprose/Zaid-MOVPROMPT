import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectLabel } from "@radix-ui/react-select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MODEL_GROUPS } from "@/lib/models";
import { getContract } from "@/lib/modelContracts";
import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles, Info } from "lucide-react";
import { useState } from "react";

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

const ModelRow = ({ value, label, description, isAny }: ModelRowProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleInfoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPopoverOpen((v) => !v);
  };

  const handleInfoPointerDown = (e: React.PointerEvent) => {
    // Prevent Radix Select from treating this as a selection
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <SelectItem value={value} className={isAny ? "font-medium pr-10" : "pr-10"}>
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="truncate">{label}</span>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={handleInfoClick}
                  onPointerDown={handleInfoPointerDown}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:text-primary"
                  aria-label={`About ${label}`}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                className="w-72 text-xs leading-relaxed border-l-2 border-l-primary"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="font-semibold mb-1 font-display">{label}</p>
                <p className="text-muted-foreground">{description}</p>
              </PopoverContent>
            </Popover>
          </div>
        </SelectItem>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        className="max-w-[280px] text-xs leading-relaxed border-l-2 border-l-primary"
      >
        <p className="font-semibold mb-0.5 font-display">{label}</p>
        <p className="text-muted-foreground">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export const ModelPicker = ({ model, onModelChange }: ModelPickerProps) => {
  const { t } = useLanguage();
  const contract = getContract(model);
  const variantDesc = contract.variantDescKey ? t(contract.variantDescKey as any) : null;

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 space-y-3 shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <Label className="text-sm font-medium font-display">{t("modelPicker.title" as any)}</Label>
      </div>
      <TooltipProvider delayDuration={200}>
        <Select value={model} onValueChange={onModelChange}>
          <SelectTrigger className="bg-secondary border-border h-11 text-base">
            <SelectValue placeholder={t("config.chooseModel")} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <ModelRow
              value="any"
              label={t("config.anyModel")}
              description={t("models.desc.any" as any)}
              isAny
            />
            <SelectSeparator />
            {MODEL_GROUPS.map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
      </TooltipProvider>
      {variantDesc && (
        <p className="text-xs text-muted-foreground/80 italic">{variantDesc}</p>
      )}
    </div>
  );
};
