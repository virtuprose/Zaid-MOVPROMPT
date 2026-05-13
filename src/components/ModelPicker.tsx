import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectLabel } from "@radix-ui/react-select";
import { Label } from "@/components/ui/label";
import { MODEL_GROUPS, type ModelGroup } from "@/lib/models";
import { getContract } from "@/lib/modelContracts";
import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles, Search, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  model: string;
  onModelChange: (v: string) => void;
}

const ALL_PROVIDERS = ["Veo", "Kling", "Seedance", "Sora", "Runway", "Wan", "Hailuo", "Pika"];

const GROUP_META: Record<string, { short: string; company: string; order: number }> = {
  "Google": { short: "VEO", company: "by Google", order: 1 },
  "Kuaishou (Kling)": { short: "KLING", company: "by Kuaishou", order: 2 },
  "ByteDance (Seedance)": { short: "SEEDANCE", company: "by ByteDance", order: 3 },
};

const VARIANT_TOKENS = ["Omni Edit", "Motion Control", "Video Edit", "Pro Fast", "Omni", "Turbo", "Fast", "Lite", "Pro", "Video"];

function splitLabel(label: string): { base: string; variant: string | null } {
  for (const tok of VARIANT_TOKENS) {
    const re = new RegExp(`\\s+${tok}$`, "i");
    if (re.test(label)) {
      return { base: label.replace(re, ""), variant: tok.toUpperCase() };
    }
  }
  return { base: label, variant: null };
}

interface ModelRowProps {
  value: string;
  label: string;
  description: string;
  isAny?: boolean;
}

const ModelRow = ({ value, label, description, isAny }: ModelRowProps) => {
  const { base, variant } = isAny ? { base: label, variant: null } : splitLabel(label);
  return (
    <SelectItem
      value={value}
      className={cn(
        "items-start py-2.5 ps-5 pe-4 min-h-[3rem] cursor-pointer relative",
        "border-l-2 border-l-transparent hover:border-l-primary hover:bg-[#161618]",
        "data-[state=checked]:border-l-primary data-[state=checked]:bg-primary/[0.06]",
        "data-[highlighted]:bg-[#161618] data-[highlighted]:[&_*]:text-inherit",
        "[&>span:last-child]:block [&>span:last-child]:w-full [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1"
      )}
    >
      <div className="flex flex-col gap-1 w-full min-w-0 pe-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[15px] leading-tight text-foreground", isAny ? "font-semibold" : "font-semibold")}>
            {base}
          </span>
          {variant && (
            <span className="inline-flex items-center px-1.5 py-[1px] rounded border border-primary/60 text-primary text-[10px] font-semibold uppercase tracking-wider leading-none">
              {variant}
            </span>
          )}
          {isAny && (
            <span className="inline-flex items-center px-1.5 py-[1px] rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider leading-none">
              Recommended
            </span>
          )}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="ms-auto text-muted-foreground/60 hover:text-primary transition-colors"
                  aria-label="Model info"
                >
                  <HelpCircle size={13} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="start" className="max-w-xs text-xs">
                <p className="mb-1.5">{description}</p>
                <ul className="list-disc ps-4 space-y-0.5 text-muted-foreground">
                  <li>Best for cinematic image-to-video</li>
                  <li>Supports 16:9 / 9:16 / 1:1</li>
                  <li>Up to ~10s clips</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="block w-full text-[11px] text-muted-foreground whitespace-normal break-words leading-snug">
          {description}
        </span>
      </div>
    </SelectItem>
  );
};

export const ModelPicker = ({ model, onModelChange }: ModelPickerProps) => {
  const { t } = useLanguage();
  const contract = getContract(model);
  const variantDesc = contract.variantDescKey ? t(contract.variantDescKey as any) : null;
  const [flash, setFlash] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setFlash(true);
    const id = setTimeout(() => setFlash(false), 200);
    return () => clearTimeout(id);
  }, [model]);

  const sortedGroups: ModelGroup[] = useMemo(() => {
    return [...MODEL_GROUPS].sort(
      (a, b) => (GROUP_META[a.label]?.order ?? 99) - (GROUP_META[b.label]?.order ?? 99)
    );
  }, []);

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return sortedGroups;
    return sortedGroups
      .map((g) => ({ ...g, models: g.models.filter((m) => m.label.toLowerCase().includes(q)) }))
      .filter((g) => g.models.length > 0);
  }, [sortedGroups, q]);

  return (
    <div data-tour="model-picker" className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 space-y-3 shadow-md">
      <div className="flex items-center gap-2">
        <Sparkles className={cn("w-4 h-4 text-primary", flash && "animate-pulse")} />
        <Label className="text-sm font-medium font-display">{t("modelPicker.title" as any)}</Label>
      </div>
      <Select value={model} onValueChange={onModelChange} open={open} onOpenChange={setOpen}>
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
          position="popper"
          sideOffset={6}
          className="model-picker-content w-[min(32rem,calc(100vw-1.5rem))] sm:w-[32rem] max-w-[calc(100vw-1.5rem)] overscroll-contain p-0 relative"
          style={{
            zIndex: 1000,
            maxHeight: 480,
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}
        >
          {/* Search */}
          <div className="sticky top-0 z-20 bg-popover border-b border-border/60 px-3 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search models..."
                className="w-full bg-secondary/60 border border-border rounded-md text-xs ps-7 pe-2 py-1.5 outline-none focus:border-primary/50 placeholder:text-muted-foreground"
              />
            </div>
            {/* Providers */}
            <div className="mt-2">
              <div className="text-[12px] text-muted-foreground mb-1">Available providers</div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
                {ALL_PROVIDERS.map((p, i) => (
                  <span key={p} className="inline-flex items-center">
                    <span className="text-foreground/80 font-medium">{p}</span>
                    {i < ALL_PROVIDERS.length - 1 && <span className="ms-1.5 opacity-40">·</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              maxHeight: 480 - 92,
              overflowY: "auto",
              scrollbarColor: "hsl(var(--muted-foreground) / 0.3) transparent",
              scrollbarWidth: "thin",
            }}
          >
            {!q && (
              <>
                <ModelRow
                  value="any"
                  label={t("config.anyModel")}
                  description={t("models.desc.any" as any)}
                  isAny
                />
                <SelectSeparator />
              </>
            )}
            {filteredGroups.map((group) => {
              const meta = GROUP_META[group.label];
              return (
                <SelectGroup key={group.label}>
                  <SelectLabel className="sticky top-0 z-10 px-3 py-2 bg-popover/95 backdrop-blur shadow-[0_1px_0_hsl(var(--border))]">
                    <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {meta?.short ?? group.label}
                    </div>
                    {meta && (
                      <div className="text-[11px] text-muted-foreground lowercase font-normal mt-0.5">
                        {meta.company}
                      </div>
                    )}
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
              );
            })}
            {filteredGroups.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                No models match "{query}"
              </div>
            )}
          </div>

          {/* Gradient fade indicating scroll */}
          <div
            className="pointer-events-none absolute left-0 right-0 bottom-0 h-10 rounded-b-xl"
            style={{
              background: "linear-gradient(to bottom, transparent, hsl(var(--popover)) 85%)",
            }}
          />
        </SelectContent>
      </Select>
      {variantDesc && !open && (
        <p className="text-xs text-muted-foreground/80 italic">{variantDesc}</p>
      )}
    </div>
  );
};
