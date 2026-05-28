import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X, Gift, Smartphone, Link as LinkIcon, Sparkles, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBrandKit, EMPTY_BRAND_KIT, analyzeBrandImage, MAX_BRAND_ANGLES, type BrandKit, type ProductReference } from "@/lib/marketing/brandKit";
import { supabase } from "@/integrations/supabase/client";
import type { Subject } from "@/lib/marketingStudio";
import { ProductFactSheet } from "./ProductFactSheet";

export function BrandKitSheet({
  open,
  onOpenChange,
  onSaved,
  kitId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (kit: BrandKit) => void;
  /** When set, edit this kit. When null/undefined, create a new one. */
  kitId?: string | null;
}) {
  const { kits, saveKit, deleteKit, uploadLogo, addReference, updateReferenceLabel, removeReference } = useBrandKit();
  const [draft, setDraft] = useState<BrandKit>(EMPTY_BRAND_KIT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoMode, setLogoMode] = useState<"upload" | "url">("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [justFilled, setJustFilled] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlDebounce = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (kitId) {
      const found = kits.find((k) => k.id === kitId);
      setDraft(found ?? EMPTY_BRAND_KIT);
    } else {
      setDraft(EMPTY_BRAND_KIT);
    }
    // Intentionally omit `kits` — re-running on kits changes wipes
    // in-progress edits (notably an uploaded logo_path) when the parent
    // reloads brands mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kitId]);

  // Keep `references` synced from the latest kits list (other fields stay
  // local to preserve in-progress edits).
  useEffect(() => {
    if (!draft.id) return;
    const fresh = kits.find((k) => k.id === draft.id);
    if (!fresh) return;
    setDraft((d) => ({ ...d, references: fresh.references ?? [] }));
  }, [kits, draft.id]);

  const [angleUploading, setAngleUploading] = useState(false);
  const [specUploading, setSpecUploading] = useState(false);
  const angleFileRef = useRef<HTMLInputElement>(null);
  const specFileRef = useRef<HTMLInputElement>(null);

  const ensureSavedKit = async (): Promise<string | null> => {
    if (draft.id) return draft.id;
    if (!draft.name.trim()) {
      toast.error("Name your product first, then add angle photos.");
      return null;
    }
    try {
      const saved = await saveKit(draft);
      setDraft((d) => ({ ...d, id: saved.id, updated_at: saved.updated_at }));
      return saved.id ?? null;
    } catch (e: any) {
      toast.error(e?.message || "Couldn't save product");
      return null;
    }
  };

  const handleAngleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Image must be under 25MB"); return; }
    const angles = (draft.references ?? []).filter((r) => r.kind === "angle");
    if (angles.length >= MAX_BRAND_ANGLES) {
      toast.error(`Up to ${MAX_BRAND_ANGLES} angle photos`);
      return;
    }
    const kid = await ensureSavedKit();
    if (!kid) return;
    setAngleUploading(true);
    try {
      const label = ["front", "back", "side", "top", "packaging"][angles.length] ?? null;
      await addReference(kid, file, "angle", label);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't upload angle");
    } finally {
      setAngleUploading(false);
    }
  };

  const handleSpecFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("File must be under 25MB"); return; }
    const kid = await ensureSavedKit();
    if (!kid) return;
    setSpecUploading(true);
    try {
      // Remove any existing spec sheet first (only one allowed).
      const existingSpec = (draft.references ?? []).find((r) => r.kind === "spec_sheet");
      if (existingSpec) await removeReference(existingSpec.id);
      await addReference(kid, file, "spec_sheet", null);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't upload spec sheet");
    } finally {
      setSpecUploading(false);
    }
  };

  const update = <K extends keyof BrandKit>(k: K, v: BrandKit[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const runAnalyze = async (input: { imagePath?: string | null; imageUrl?: string | null }) => {
    setAnalyzing(true);
    try {
      const res = await analyzeBrandImage({ ...input, subject: draft.subject });
      setDraft((d) => ({
        ...d,
        name: d.name?.trim() ? d.name : res.name ?? d.name,
        description: d.description?.trim() ? d.description : res.description ?? d.description,
        tagline: d.tagline?.trim() ? d.tagline : res.tagline ?? d.tagline,
        // Fact-sheet fields: always refresh from the latest analysis so the
        // video model can lock onto the real product details.
        category: res.category ?? d.category,
        visual_parts: res.visual_parts ?? d.visual_parts,
        materials: res.materials ?? d.materials,
        hero_colors: res.hero_colors ?? d.hero_colors,
        packaging: res.packaging ?? d.packaging,
      }));
      setJustFilled(true);
      window.setTimeout(() => setJustFilled(false), 4000);
    } catch (e: any) {
      toast.error("Couldn't auto-read the image — fill it in manually");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image must be under 25MB");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadLogo(file);
      update("logo_path", path);
      update("logo_url", URL.createObjectURL(file));
      runAnalyze({ imagePath: path });
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    update("logo_path", null);
    update("logo_url", url || null);
    if (urlDebounce.current) window.clearTimeout(urlDebounce.current);
    if (!url) return;
    const trimmed = url.trim();
    if (!/^https?:\/\/\S+$/i.test(trimmed)) return; // still typing
    const isDirectImage = /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(trimmed);
    urlDebounce.current = window.setTimeout(async () => {
      if (isDirectImage) {
        runAnalyze({ imageUrl: trimmed });
        return;
      }
      // Product page URL → scrape hero image + title first, then analyze.
      setAnalyzing(true);
      try {
        const { data, error } = await supabase.functions.invoke("scrape-product-url", {
          body: { url: trimmed },
        });
        if (error || !data?.image_url) {
          throw error || new Error("no_image_found");
        }
        update("logo_url", data.image_url);
        // Pre-fill name/description if empty so the user has a head start.
        setDraft((d) => ({
          ...d,
          name: d.name?.trim() ? d.name : (data.name ?? d.name),
          description: d.description?.trim() ? d.description : (data.description ?? d.description),
        }));
        await runAnalyze({ imageUrl: data.image_url });
      } catch (e: any) {
        const code = e?.message || "";
        toast.error(
          code.includes("no_image_found")
            ? "Couldn't find a product image on that page. Try right-click → Copy image address."
            : "Couldn't read that page. Paste a direct image link instead.",
        );
      } finally {
        setAnalyzing(false);
      }
    }, 600);
  };



  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error("Name your product first");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveKit(draft);
      toast.success("Product saved");
      onSaved?.(saved);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft.id) return;
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteKit(draft.id);
      toast.success("Product deleted");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not delete");
    }
  };

  const hasLogo = !!draft.logo_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] p-0 gap-0 max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {draft.id ? "Edit product" : "New product"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Saved to your product library — reuse it on any ad.
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Card 2 — Visuals */}
          <Card
            title="Visuals"
            helper="Upload a main image so the Director can lock onto your product."
          >
            <div>
              <SubLabel>
                {draft.subject === "app" ? "App icon / screenshot" : "Main image"}
              </SubLabel>
              <Segmented>
                <SegBtn
                  icon={<Upload className="w-4 h-4" />}
                  label="Upload"
                  active={logoMode === "upload"}
                  onClick={() => setLogoMode("upload")}
                />
                <SegBtn
                  icon={<LinkIcon className="w-4 h-4" />}
                  label="Image URL"
                  active={logoMode === "url"}
                  onClick={() => setLogoMode("url")}
                />
              </Segmented>

              {logoMode === "upload" ? (
                hasLogo ? (
                  <div className="mt-3 flex items-center gap-4 p-3 pr-4 rounded-xl border border-border/60 bg-secondary/20">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted/30 shrink-0">
                      <img src={draft.logo_url!} alt="Brand" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90 truncate">
                        {draft.name?.trim() || "Brand image"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {analyzing ? "Analyzing…" : "Ready"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                        className="h-8"
                      >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          update("logo_path", null);
                          update("logo_url", null);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                      "mt-3 w-full h-[140px] rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60",
                      dragOver
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/60 hover:bg-secondary/20 bg-secondary/10",
                    )}
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    ) : (
                      <ImagePlus className="w-6 h-6 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium text-foreground/90">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP — up to 25 MB</p>
                  </button>
                )
              ) : (
                <div className="mt-3 space-y-1.5">
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={draft.logo_url ?? ""}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="Paste a product page (Amazon, Shopify…) or direct image link"
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">We'll grab the product photo + title automatically. Direct image links (PNG, JPG, WEBP) also work.</p>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              {(analyzing || justFilled) && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-medium">
                  {analyzing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Reading your brand…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Filled by AI — edit anything
                    </>
                  )}
                </div>
              )}
            </div>

            <AnglesSection
              references={draft.references ?? []}
              uploading={angleUploading}
              specUploading={specUploading}
              onPickAngle={() => angleFileRef.current?.click()}
              onPickSpec={() => specFileRef.current?.click()}
              onRelabel={updateReferenceLabel}
              onRemove={removeReference}
            />
            <input
              ref={angleFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleAngleFile(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={specFileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                handleSpecFile(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </Card>

          {/* Card 3 — Description */}
          <Card
            title="Detailed description"
            helper="What it does, who it's for, what makes it different."
          >
            <FieldArea
              label="Description"
              value={draft.description}
              onChange={(v) => update("description", v)}
              placeholder="What it does, who it's for, what makes it different…"
              max={500}
            />
          </Card>

          {/* Card — Product basics */}
          <Card title="Product basics" helper="The essentials shown on every ad.">
            <Field
              label="Name"
              required
              value={draft.name}
              onChange={(v) => update("name", v)}
              placeholder="Acme Sneakers"
            />
            <Field
              label="Tagline"
              value={draft.tagline ?? ""}
              onChange={(v) => update("tagline", v || null)}
              placeholder="Sleep smarter. Run faster."
              max={60}
            />
          </Card>


          {/* Card 4 — AI fact sheet */}
          <ProductFactSheet
            draft={draft}
            update={update}
            analyzing={analyzing}
            canReanalyze={!!draft.logo_url}
            onReanalyze={() =>
              runAnalyze(
                draft.logo_path
                  ? { imagePath: draft.logo_path }
                  : { imageUrl: draft.logo_url },
              )
            }
          />
        </div>


        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex items-center gap-2">
          {draft.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[140px] bg-[#F5A524] text-black hover:bg-[#F5A524]/90"
          >
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {draft.id ? "Save changes" : "Save product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Card({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/40 bg-secondary/10 p-4 space-y-4">
      <header className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </header>
      {children}
    </section>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
      {children}
    </Label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
      {children}
    </Label>
  );
}


function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 inline-flex w-full p-1 rounded-lg border border-border/60 bg-secondary/30">
      {children}
    </div>
  );
}

function SegBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60",
        active
          ? "bg-[#F5A524] text-black shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  max?: number;
}) {
  return (
    <div>
      <Label className="text-[11px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-[hsl(0_72%_60%)]"> *</span>}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={max}
        className="mt-1.5"
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
  const count = value?.length ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        {max && (
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">
            {count}/{max}
          </span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={max}
        className="mt-1.5 min-h-[96px] resize-none"
      />
    </div>
  );
}

function AnglesSection({
  references,
  uploading,
  specUploading,
  onPickAngle,
  onPickSpec,
  onRelabel,
  onRemove,
}: {
  references: ProductReference[];
  uploading: boolean;
  specUploading: boolean;
  onPickAngle: () => void;
  onPickSpec: () => void;
  onRelabel: (id: string, label: string | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const angles = references.filter((r) => r.kind === "angle");
  const spec = references.find((r) => r.kind === "spec_sheet");
  const canAdd = angles.length < MAX_BRAND_ANGLES;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <SectionLabel>Reference photos · optional</SectionLabel>
          <span className="text-[10px] text-muted-foreground/70 tabular-nums">
            {angles.length}/{MAX_BRAND_ANGLES}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {angles.map((r) => (
            <div key={r.id} className="relative group rounded-lg overflow-hidden border border-border/60 bg-muted/30 aspect-square">
              {r.image_url ? (
                <img src={r.image_url} alt={r.label ?? "angle"} className="w-full h-full object-cover" />
              ) : null}
              <input
                value={r.label ?? ""}
                onChange={(e) => onRelabel(r.id, e.target.value || null)}
                placeholder="label"
                className="absolute bottom-1 left-1 right-7 h-6 px-1.5 rounded bg-black/70 text-white text-[10px] outline-none placeholder:text-white/50"
              />
              <button
                type="button"
                onClick={() => onRemove(r.id)}
                aria-label="Remove angle"
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {canAdd && (
            <button
              type="button"
              onClick={onPickAngle}
              disabled={uploading}
              className={cn(
                "aspect-square rounded-lg border border-dashed border-border hover:border-accent/60 hover:bg-secondary/20 bg-secondary/10",
                "flex flex-col items-center justify-center gap-1 text-muted-foreground transition",
              )}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              <span className="text-[10px] font-medium">Add photo</span>
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Angles, packaging, lifestyle — anything that shows the product. More references = stronger 3D lock so it looks identical across every shot.
        </p>
      </div>

      <div>
        <SectionLabel>Product spec sheet · optional</SectionLabel>
        {spec ? (
          <div className="mt-2 flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-secondary/20">
            <div className="w-10 h-10 rounded-md bg-muted/40 inline-flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
              {/\.pdf$/i.test(spec.image_path) ? "PDF" : "IMG"}
            </div>
            <div className="flex-1 min-w-0 text-xs text-foreground/80 truncate">Spec sheet attached</div>
            <Button type="button" variant="ghost" size="sm" onClick={onPickSpec} disabled={specUploading} className="h-8">
              {specUploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
              Replace
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(spec.id)} className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Remove spec sheet">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onPickSpec}
            disabled={specUploading}
            className="mt-2 w-full h-[72px] rounded-lg border border-dashed border-border hover:border-accent/60 hover:bg-secondary/20 bg-secondary/10 flex flex-col items-center justify-center gap-1 text-muted-foreground transition"
          >
            {specUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-xs font-medium">Upload PDF or image</span>
          </button>
        )}
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Optional — kept on file so you can re-check exact labels, ingredients or dimensions later.
        </p>
      </div>
    </div>
  );
}
