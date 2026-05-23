import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Palette, Upload, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  EMPTY_BRAND_IDENTITY,
  TYPOGRAPHY_VIBES,
  useBrandIdentity,
  type BrandIdentity,
  type TypographyVibe,
} from "@/lib/marketing/brandIdentity";

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
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 transition-all shrink-0",
        size === "md" ? "w-8 h-8" : "w-6 h-6",
        selected ? "border-[#F5A524] scale-110" : "border-border/40 hover:border-foreground/40",
      )}
      style={{ background: color }}
      aria-label={color}
    />
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
  const [draft, setDraft] = useState<BrandIdentity>(EMPTY_BRAND_IDENTITY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [newSupport, setNewSupport] = useState("");
  const [newAvoid, setNewAvoid] = useState("");

  useEffect(() => {
    if (open) setDraft(identity ?? EMPTY_BRAND_IDENTITY);
  }, [open, identity]);

  const update = (patch: Partial<BrandIdentity>) => setDraft((d) => ({ ...d, ...patch }));

  const onPickFile = async (file: File) => {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#F5A524]" />
            Brand Kit
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Logo */}
          <section className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border border-border/60 bg-muted/30 overflow-hidden flex items-center justify-center">
                {draft.logo_url || draft.logo_path ? (
                  <img src={draft.logo_url ?? ""} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <Palette className="w-5 h-5 text-muted-foreground" />
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
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                {draft.logo_path ? "Replace" : "Upload"}
              </Button>
              {draft.logo_path && (
                <Button type="button" variant="ghost" size="sm" onClick={() => update({ logo_path: null, logo_url: null })}>
                  Remove
                </Button>
              )}
            </div>
          </section>

          {/* Primary color */}
          <section className="space-y-2">
            <Label>Primary color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <ColorSwatch key={c} color={c} selected={draft.primary_color === c} onClick={() => update({ primary_color: c })} />
              ))}
            </div>
            <Input
              placeholder="#C8102E"
              value={draft.primary_color ?? ""}
              onChange={(e) => update({ primary_color: e.target.value || null })}
              className="h-9 text-xs font-mono"
            />
          </section>

          {/* Supporting colors */}
          <section className="space-y-2">
            <Label>Supporting colors (up to 4)</Label>
            <div className="flex flex-wrap gap-2">
              {(draft.supporting_colors ?? []).map((c) => (
                <div key={c} className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 pl-1 pr-2 py-0.5 text-xs">
                  <ColorSwatch color={c} size="sm" />
                  <span className="font-mono">{c}</span>
                  <button type="button" onClick={() => removeSupporting(c)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="#1A1A1A"
                value={newSupport}
                onChange={(e) => setNewSupport(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSupporting(newSupport); } }}
                className="h-9 text-xs font-mono"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addSupporting(newSupport)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <ColorSwatch key={c} color={c} size="sm" onClick={() => addSupporting(c)} />
              ))}
            </div>
          </section>

          {/* Avoid colors */}
          <section className="space-y-2">
            <Label>Avoid colors</Label>
            <p className="text-[11px] text-muted-foreground">Colors the AI should never lean into for lighting, props, or backgrounds.</p>
            <div className="flex flex-wrap gap-1.5">
              {(draft.avoid_colors ?? []).map((c) => (
                <div key={c} className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-xs">
                  <span>{c}</span>
                  <button type="button" onClick={() => removeAvoid(c)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. blue, neon pink"
                value={newAvoid}
                onChange={(e) => setNewAvoid(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAvoid(newAvoid); } }}
                className="h-9 text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addAvoid(newAvoid)}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVOID_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => addAvoid(c)}
                  className="px-2 py-0.5 rounded-full text-[11px] border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                >
                  + {c}
                </button>
              ))}
            </div>
          </section>

          {/* Typography vibe */}
          <section className="space-y-2">
            <Label>Typography vibe</Label>
            <div className="grid grid-cols-2 gap-2">
              {TYPOGRAPHY_VIBES.map((v) => {
                const active = draft.typography_vibe === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => update({ typography_vibe: active ? null : (v.id as TypographyVibe) })}
                    className={cn(
                      "rounded-xl border p-2.5 text-left transition-all",
                      active ? "border-[#F5A524] bg-[#F5A524]/10" : "border-border/60 hover:border-foreground/40",
                    )}
                  >
                    <div className="text-xs font-semibold text-foreground">{v.label}</div>
                    <div className="text-[10px] text-muted-foreground">{v.hint}</div>
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
          </section>

          {/* Mood */}
          <section className="space-y-2">
            <Label>Mood / style notes</Label>
            <Textarea
              placeholder="premium, minimal, lots of white space"
              value={draft.mood_notes ?? ""}
              onChange={(e) => update({ mood_notes: e.target.value || null })}
              className="text-xs min-h-[72px]"
              maxLength={280}
            />
          </section>

          {/* Tagline */}
          <section className="space-y-2">
            <Label>Brand tagline (optional)</Label>
            <Input
              placeholder="Built different."
              value={draft.tagline ?? ""}
              onChange={(e) => update({ tagline: e.target.value || null })}
              className="h-9 text-xs"
              maxLength={120}
            />
          </section>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
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
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={onSave} disabled={saving} className="bg-[#F5A524] text-black hover:bg-[#F5A524]/90">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save brand kit
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
