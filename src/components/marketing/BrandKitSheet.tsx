import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X, Gift, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBrandKit, EMPTY_BRAND_KIT, type BrandKit } from "@/lib/marketing/brandKit";
import type { Subject } from "@/lib/marketingStudio";

export function BrandKitSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (kit: BrandKit) => void;
}) {
  const { kit, save, uploadLogo } = useBrandKit();
  const [draft, setDraft] = useState<BrandKit>(EMPTY_BRAND_KIT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDraft(kit ?? EMPTY_BRAND_KIT);
  }, [open, kit]);

  const update = <K extends keyof BrandKit>(k: K, v: BrandKit[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadLogo(file);
      update("logo_path", path);
      update("logo_url", URL.createObjectURL(file));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error("Name your brand first");
      return;
    }
    setSaving(true);
    try {
      await save(draft);
      toast.success("Brand kit saved");
      onSaved?.(draft);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your brand</SheetTitle>
          <SheetDescription>
            Fill this once. The AI uses it to ground every ad in your real product.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Subject toggle */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Type
            </Label>
            <div className="mt-2 inline-flex w-full p-1 rounded-xl border border-border/50 bg-muted/20">
              <SubjectBtn
                icon={<Gift className="w-4 h-4" />}
                label="Product"
                active={draft.subject === "product"}
                onClick={() => update("subject", "product" as Subject)}
              />
              <SubjectBtn
                icon={<Smartphone className="w-4 h-4" />}
                label="App"
                active={draft.subject === "app"}
                onClick={() => update("subject", "app" as Subject)}
              />
            </div>
          </div>

          {/* Logo */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {draft.subject === "app" ? "App icon / screenshot" : "Logo / product image"}
            </Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative w-20 h-20 rounded-xl border border-border/60 bg-muted/20 overflow-hidden flex items-center justify-center">
                {draft.logo_url ? (
                  <>
                    <img
                      src={draft.logo_url}
                      alt="Brand"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        update("logo_path", null);
                        update("logo_url", null);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {draft.logo_path ? "Replace" : "Upload"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">PNG/JPG, ≤5MB</p>
              </div>
            </div>
          </div>

          {/* Fields */}
          <Field
            label="Name"
            required
            value={draft.name}
            onChange={(v) => update("name", v)}
            placeholder="Acme Sneakers"
          />
          <FieldArea
            label="One-line description"
            value={draft.description}
            onChange={(v) => update("description", v)}
            placeholder="AI-powered sleep tracker for athletes"
            max={120}
          />
          <Field
            label="Website / App Store URL"
            value={draft.url ?? ""}
            onChange={(v) => update("url", v || null)}
            placeholder="https://"
          />
          <Field
            label="Tagline"
            value={draft.tagline ?? ""}
            onChange={(v) => update("tagline", v || null)}
            placeholder="Sleep smarter. Run faster."
            max={60}
          />
          <FieldArea
            label="Target audience"
            value={draft.audience ?? ""}
            onChange={(v) => update("audience", v || null)}
            placeholder="Gen-Z runners in major US cities"
            max={160}
          />

          <div className="pt-2 flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#F5A524] text-black hover:bg-[#F5A524]/90"
            >
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save brand
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubjectBtn({
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
        "flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-[#F5A524] text-black"
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
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
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
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={max}
        className="mt-1.5 min-h-[60px] resize-none"
      />
    </div>
  );
}
