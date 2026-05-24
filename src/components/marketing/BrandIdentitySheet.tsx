import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Palette, Upload, X, Sparkles, Image as ImageIcon, Sun, Layers, Gauge, BadgeCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  EMPTY_BRAND_IDENTITY,
  TYPOGRAPHY_VIBES,
  LIGHTING_STYLES,
  FINISH_VIBES,
  PACING_OPTIONS,
  LOGO_TREATMENTS,
  useBrandIdentity,
  type BrandIdentity,
  type TypographyVibe,
  type LightingStyle,
  type FinishVibe,
  type Pacing,
  type LogoTreatment,
} from "@/lib/marketing/brandIdentity";
import { useBrandKit } from "@/lib/marketing/brandKit";

const COLOR_PRESETS = [
  "#C8102E", "#E85D3A", "#F5A524", "#FFD23F",
  "#2DD4A8", "#0EA5E9", "#4F46E5", "#A78BFA",
  "#EC4899", "#1A1A1A", "#F5F0E6", "#FFFFFF",
];

const AVOID_PRESETS = ["blue", "neon", "pink", "purple", "green", "yellow", "red"];

function ColorSwatch({
  color,
  selected,
  onClick,
  size = "md",
}: {
  color: string;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border transition-all shrink-0 relative",
        size === "lg" ? "w-10 h-10" : size === "md" ? "w-8 h-8" : "w-6 h-6",
        selected
          ? "border-accent ring-2 ring-accent/40 ring-offset-2 ring-offset-background scale-105"
          : "border-border/40 hover:border-foreground/40 hover:scale-105",
      )}
      style={{ background: color }}
      aria-label={color}
    />
  );
}

function Section({
  eyebrow,
  title,
  helper,
  icon,
  children,
}: {
  eyebrow?: string;
  title: string;
  helper?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/40 p-4",
        "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]",
      )}
    >
      <div className="mb-3 space-y-0.5">
        {eyebrow && (
          <div className="text-[10px] font-semibold tracking-[0.14em] uppercase text-accent/80 flex items-center gap-1.5">
            {icon}
            {eyebrow}
          </div>
        )}
        <h3 className="text-sm font-semibold tracking-tight text-foreground font-display">
          {title}
        </h3>
        {helper && <p className="text-xs text-muted-foreground leading-snug">{helper}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: { id: T; label: string; hint: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  cols?: 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", cols === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(active ? null : o.id)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left transition-all",
              active
                ? "border-accent bg-accent/10 shadow-[0_0_0_4px_hsl(var(--accent)/0.10)]"
                : "border-border/60 hover:border-foreground/40 hover:bg-secondary/30",
            )}
          >
            <div className="text-xs font-semibold text-foreground">{o.label}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{o.hint}</div>
          </button>
        );
      })}
    </div>
  );
}

export function BrandIdentitySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { identity, save, uploadLogo, clear } = useBrandIdentity();
  const { setActiveIds: setBrandActiveIds } = useBrandKit();
  const [draft, setDraft] = useState<BrandIdentity>(EMPTY_BRAND_IDENTITY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [newSupport, setNewSupport] = useState("");
  const [newAvoid, setNewAvoid] = useState("");

  useEffect(() => {
    if (open) setDraft(identity ?? EMPTY_BRAND_IDENTITY);
  }, [open, identity]);

  const update = (patch: Partial<BrandIdentity>) => setDraft((d) => ({ ...d, ...patch }));

  const onPickFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Logo must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadLogo(file);
      update({ logo_path: path, logo_url: URL.createObjectURL(file) });
    } catch (e: any) {
      toast.error(e?.message || "Couldn't upload logo");
    } finally {
      setUploading(false);
    }
  };

  const addSupporting = (c: string) => {
    const color = c.trim();
    if (!color) return;
    const list = draft.supporting_colors ?? [];
    if (list.includes(color) || list.length >= 4) return;
    update({ supporting_colors: [...list, color] });
    setNewSupport("");
  };
  const removeSupporting = (c: string) =>
    update({ supporting_colors: (draft.supporting_colors ?? []).filter((x) => x !== c) });

  const addAvoid = (c: string) => {
    const v = c.trim().toLowerCase();
    if (!v) return;
    const list = draft.avoid_colors ?? [];
    if (list.includes(v)) return;
    update({ avoid_colors: [...list, v] });
    setNewAvoid("");
  };
  const removeAvoid = (c: string) =>
    update({ avoid_colors: (draft.avoid_colors ?? []).filter((x) => x !== c) });

  const onSave = async () => {
    setSaving(true);
    try {
      await save(draft);
      toast.success("Brand kit saved");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const hasLogo = !!(draft.logo_url || draft.logo_path);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden bg-background"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 space-y-2 relative">
          <SheetTitle className="flex items-center gap-2.5 text-base font-display">
            <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent">
              <Palette className="w-4 h-4" />
              <span className="absolute inset-0 rounded-lg ring-1 ring-accent/30" />
            </span>
            Brand Kit
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Your brand's DNA — the Director uses every field below to shape lighting, props, pacing and on-screen text.
          </p>
          <div className="absolute left-5 right-5 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/40 to-accent/40" />
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Identity */}
          <Section
            eyebrow="01 · Identity"
            title="Logo & industry"
            helper="What we're working with."
            icon={<Sparkles className="w-2.5 h-2.5" />}
          >
            <div className="flex items-stretch gap-3">
              <div
                className={cn(
                  "w-20 h-20 rounded-xl border bg-muted/20 overflow-hidden flex items-center justify-center shrink-0 transition-colors",
                  hasLogo ? "border-border/60" : "border-dashed border-border",
                )}
              >
                {hasLogo ? (
                  <img src={draft.logo_url ?? ""} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickFile(f);
                  e.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void onPickFile(f);
                }}
                disabled={uploading}
                className={cn(
                  "flex-1 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 text-xs transition-all",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/60 hover:bg-secondary/20 bg-secondary/10",
                )}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground/90">
                  {hasLogo ? "Replace logo" : "Drop or click to upload"}
                </span>
                <span className="text-[10px] text-muted-foreground">PNG · SVG · JPG — up to 10MB</span>
              </button>
              {hasLogo && (
                <button
                  type="button"
                  onClick={() => update({ logo_path: null, logo_url: null })}
                  className="self-start rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  aria-label="Remove logo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Industry / category</Label>
              <Input
                placeholder="e.g. skincare, SaaS, streetwear, fintech"
                value={draft.industry ?? ""}
                onChange={(e) => update({ industry: e.target.value || null })}
                maxLength={40}
                className="h-9 text-xs mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Anchors the world the Director writes — a skincare ad shouldn't feel like fintech.
              </p>
            </div>
          </Section>

          {/* Color system */}
          <Section
            eyebrow="02 · Color"
            title="Color system"
            helper="Drives lighting tints, props, wardrobe and background tones — never repainted onto the real product."
          >
            <div>
              <Label className="text-[11px] text-muted-foreground">Primary</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {COLOR_PRESETS.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    size="lg"
                    selected={draft.primary_color === c}
                    onClick={() => update({ primary_color: c })}
                  />
                ))}
              </div>
              <Input
                placeholder="#C8102E"
                value={draft.primary_color ?? ""}
                onChange={(e) => update({ primary_color: e.target.value || null })}
                className="h-8 text-xs font-mono mt-2"
              />
            </div>

            <div className="pt-2 border-t border-border/40">
              <Label className="text-[11px] text-muted-foreground">Supporting (up to 4)</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 min-h-[28px]">
                {(draft.supporting_colors ?? []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">No supporting colors yet.</p>
                )}
                {(draft.supporting_colors ?? []).map((c) => (
                  <div key={c} className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 pl-1 pr-2 py-0.5 text-[11px]">
                    <ColorSwatch color={c} size="sm" />
                    <span className="font-mono">{c}</span>
                    <button type="button" onClick={() => removeSupporting(c)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="#1A1A1A"
                  value={newSupport}
                  onChange={(e) => setNewSupport(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSupporting(newSupport); } }}
                  className="h-8 text-xs font-mono"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addSupporting(newSupport)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COLOR_PRESETS.map((c) => (
                  <ColorSwatch key={c} color={c} size="sm" onClick={() => addSupporting(c)} />
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border/40">
              <Label className="text-[11px] text-muted-foreground">Avoid</Label>
              <p className="text-[10px] text-muted-foreground">Hard no's. The Director won't use these in lighting, props, wardrobe or backgrounds.</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5 min-h-[20px]">
                {(draft.avoid_colors ?? []).map((c) => (
                  <div key={c} className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-[11px]">
                    <span>{c}</span>
                    <button type="button" onClick={() => removeAvoid(c)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="e.g. neon pink"
                  value={newAvoid}
                  onChange={(e) => setNewAvoid(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAvoid(newAvoid); } }}
                  className="h-8 text-xs"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addAvoid(newAvoid)}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {AVOID_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => addAvoid(c)}
                    className="px-2 py-0.5 rounded-full text-[10px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* Typography */}
          <Section
            eyebrow="03 · Type"
            title="Typography vibe"
            helper="Used for any on-screen text in the video — captions, end-card, supers."
          >
            <div className="grid grid-cols-2 gap-2">
              {TYPOGRAPHY_VIBES.map((v) => {
                const active = draft.typography_vibe === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => update({ typography_vibe: active ? null : (v.id as TypographyVibe) })}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-all flex items-center gap-3",
                      active
                        ? "border-accent bg-accent/10 shadow-[0_0_0_4px_hsl(var(--accent)/0.10)]"
                        : "border-border/60 hover:border-foreground/40 hover:bg-secondary/30",
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-md flex items-center justify-center text-base shrink-0",
                        active ? "bg-accent/15 text-accent" : "bg-muted/40 text-foreground/80",
                      )}
                      style={{ fontFamily: v.fontFamily }}
                    >
                      {v.sample}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-xs font-semibold text-foreground truncate"
                        style={{ fontFamily: v.fontFamily }}
                      >
                        {v.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{v.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <Input
              placeholder="Optional font name (e.g. Söhne, Playfair)"
              value={draft.font_hint ?? ""}
              onChange={(e) => update({ font_hint: e.target.value || null })}
              className="h-9 text-xs"
            />
          </Section>

          {/* Cinematic feel */}
          <Section
            eyebrow="04 · Feel"
            title="Cinematic feel"
            helper="The four levers a DoP would set before rolling."
            icon={<Sun className="w-2.5 h-2.5" />}
          >
            <div>
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Sun className="w-3 h-3" /> Lighting</Label>
              <div className="mt-1.5">
                <ChipGrid<LightingStyle>
                  options={LIGHTING_STYLES}
                  value={draft.lighting_style}
                  onChange={(v) => update({ lighting_style: v })}
                  cols={3}
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Layers className="w-3 h-3" /> Finish / feel</Label>
              <div className="mt-1.5">
                <ChipGrid<FinishVibe>
                  options={FINISH_VIBES}
                  value={draft.finish_vibe}
                  onChange={(v) => update({ finish_vibe: v })}
                  cols={3}
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Gauge className="w-3 h-3" /> Pacing</Label>
              <div className="mt-1.5">
                <ChipGrid<Pacing>
                  options={PACING_OPTIONS}
                  value={draft.pacing}
                  onChange={(v) => update({ pacing: v })}
                  cols={3}
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5"><BadgeCheck className="w-3 h-3" /> Logo treatment</Label>
              <div className="mt-1.5">
                <ChipGrid<LogoTreatment>
                  options={LOGO_TREATMENTS}
                  value={draft.logo_treatment}
                  onChange={(v) => update({ logo_treatment: v })}
                  cols={2}
                />
              </div>
            </div>
          </Section>

          {/* Voice */}
          <Section
            eyebrow="05 · Voice"
            title="Words & mood"
            helper="Used for any spoken or written copy the Director includes."
          >
            <div>
              <Label className="text-[11px] text-muted-foreground">Tagline</Label>
              <Input
                placeholder="Built different."
                value={draft.tagline ?? ""}
                onChange={(e) => update({ tagline: e.target.value || null })}
                className="h-9 text-xs mt-1"
                maxLength={120}
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Brand voice</Label>
              <Input
                placeholder="confident, dry-witty, never corporate"
                value={draft.brand_voice ?? ""}
                onChange={(e) => update({ brand_voice: e.target.value || null })}
                className="h-9 text-xs mt-1"
                maxLength={120}
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Free-form notes</Label>
              <p className="text-[10px] text-muted-foreground">Anything else the Director should remember — references, hard rules, vibe.</p>
              <Textarea
                placeholder="premium, minimal, lots of white space. Inspired by Apple product films."
                value={draft.mood_notes ?? ""}
                onChange={(e) => update({ mood_notes: e.target.value || null })}
                className="text-xs min-h-[72px] mt-1"
                maxLength={280}
              />
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 flex items-center gap-2 bg-background/80 backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              await clear();
              onOpenChange(false);
              toast.success("Brand kit cleared");
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="bg-accent text-accent-foreground hover:bg-accent/90 min-w-[120px]"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Save brand kit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
