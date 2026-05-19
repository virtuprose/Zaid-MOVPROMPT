import { cn } from "@/lib/utils";
import { Check, User, Package, X } from "lucide-react";

export type SubjectKind = "character" | "product" | "none";

const OPTIONS: Array<{
  value: SubjectKind;
  label: string;
  caption: string;
  Icon: typeof User;
}> = [
  { value: "character", label: "Character", caption: "Build a 3-view face/body sheet", Icon: User },
  { value: "product", label: "Product / object", caption: "Build a 3-view product sheet", Icon: Package },
  { value: "none", label: "Skip", caption: "No recurring subject", Icon: X },
];

type Props = {
  chosen?: SubjectKind;
  disabled?: boolean;
  onChoose: (kind: SubjectKind) => void;
};

export function SubjectLockChoiceCard({ chosen, disabled, onChoose }: Props) {
  return (
    <div className="rounded-2xl bg-muted/15 p-4 sm:p-5 space-y-3 max-w-2xl">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground/80">
          Lock a recurring subject
        </div>
        <div className="text-sm text-foreground/85 leading-snug">
          Is there a character, product, or specific object that must look the same in every frame?
          I'll build a clean multi-angle reference sheet and pin it to every generation in this session.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const isChosen = chosen === opt.value;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled || !!chosen}
              onClick={() => onChoose(opt.value)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                "border-border/40 bg-background/40 hover:bg-background/70 hover:border-border/70",
                isChosen && "border-primary/70 bg-primary/10 hover:bg-primary/10",
                (disabled || (!!chosen && !isChosen)) && "opacity-50",
                "disabled:cursor-not-allowed",
              )}
              aria-pressed={isChosen}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-md border border-border/60 bg-muted/40">
                <Icon className={cn("h-4 w-4 text-muted-foreground", isChosen && "text-primary")} />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
                  {opt.label}
                  {isChosen && <Check className="h-3 w-3 text-primary" />}
                </div>
                <div className="text-[11px] text-muted-foreground">{opt.caption}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
