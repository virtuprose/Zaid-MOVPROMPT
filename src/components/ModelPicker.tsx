import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectLabel } from "@radix-ui/react-select";
import { Label } from "@/components/ui/label";
import { MODEL_GROUPS } from "@/lib/models";
import { getContract } from "@/lib/modelContracts";
import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles } from "lucide-react";

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
  <SelectItem value={value} className="py-2">
    <div className="flex flex-col gap-0.5 w-full">
      <span className={`truncate ${isAny ? "font-semibold" : "font-medium"}`}>{label}</span>
      <span className="text-xs text-muted-foreground line-clamp-2 leading-snug">
        {description}
      </span>
    </div>
  </SelectItem>
);

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
      <Select value={model} onValueChange={onModelChange}>
        <SelectTrigger className="bg-secondary border-border min-h-[3.75rem] h-auto py-2.5 text-base items-center [&>span]:line-clamp-none [&>span]:w-full">
          <SelectValue placeholder={t("config.chooseModel")} />
        </SelectTrigger>
        <SelectContent className="max-h-[420px]">
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
      {variantDesc && (
        <p className="text-xs text-muted-foreground/80 italic">{variantDesc}</p>
      )}
    </div>
  );
};
