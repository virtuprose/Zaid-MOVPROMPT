import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandKit } from "@/lib/marketing/brandKit";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] font-medium text-muted-foreground">
      {children}
    </Label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={max}
        className="mt-1.5 h-9 text-sm"
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={max}
        className="mt-1.5 min-h-[72px] resize-none text-sm"
      />
    </div>
  );
}

function ColorAdder({ onAdd, disabled }: { onAdd: (c: string) => void; disabled?: boolean }) {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = val.trim();
        if (!v) return;
        onAdd(v);
        setVal("");
      }}
      className="inline-flex"
    >
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="+ color"
        disabled={disabled}
        className="h-7 px-2 text-[11px] w-[100px] rounded-full"
      />
    </form>
  );
}

export function ProductFactSheet({
  draft,
  update,
  analyzing,
  canReanalyze,
  onReanalyze,
}: {
  draft: BrandKit;
  update: <K extends keyof BrandKit>(k: K, v: BrandKit[K]) => void;
  analyzing: boolean;
  canReanalyze: boolean;
  onReanalyze: () => void;
}) {
  const hasAny =
    !!draft.category ||
    !!draft.visual_parts ||
    !!draft.materials ||
    !!draft.packaging ||
    (draft.hero_colors && draft.hero_colors.length > 0);
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/15 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <SectionLabel>What the AI sees</SectionLabel>
        </div>
        {canReanalyze && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={analyzing}
            onClick={onReanalyze}
            className="h-7 px-2 text-[11px]"
          >
            {analyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            Re-analyze
          </Button>
        )}
      </div>
      {!hasAny && !analyzing && (
        <p className="text-[11px] text-muted-foreground">
          Upload an image and the AI will fill these so the video matches your real product.
        </p>
      )}
      <Field
        label="Category"
        value={draft.category ?? ""}
        onChange={(v) => update("category", v || null)}
        placeholder="smash burger, running sneaker…"
        max={40}
      />
      <FieldArea
        label="Visible parts (what every frame must show)"
        value={draft.visual_parts ?? ""}
        onChange={(v) => update("visual_parts", v || null)}
        placeholder="toasted sesame brioche bun, double patty, melted cheddar…"
        max={220}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Materials / finish"
          value={draft.materials ?? ""}
          onChange={(v) => update("materials", v || null)}
          placeholder="frosted glass, matte cap…"
          max={100}
        />
        <Field
          label="Packaging"
          value={draft.packaging ?? ""}
          onChange={(v) => update("packaging", v || null)}
          placeholder="on parchment, 12oz can…"
          max={60}
        />
      </div>
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground">Hero colors</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(draft.hero_colors ?? []).map((c, i) => (
            <span
              key={`${c}-${i}`}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-background border border-border/60 text-[11px]"
            >
              <span
                className="w-3 h-3 rounded-full border border-border/60"
                style={{ background: c }}
              />
              {c}
              <button
                type="button"
                onClick={() =>
                  update(
                    "hero_colors",
                    (draft.hero_colors ?? []).filter((_, j) => j !== i),
                  )
                }
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${c}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <ColorAdder
            onAdd={(c) =>
              update("hero_colors", [...(draft.hero_colors ?? []), c].slice(0, 5))
            }
            disabled={(draft.hero_colors?.length ?? 0) >= 5}
          />
        </div>
      </div>
    </div>
  );
}
