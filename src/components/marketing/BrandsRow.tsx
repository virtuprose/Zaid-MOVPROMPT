import { Building2, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandKit } from "@/lib/marketing/brandKit";

export function BrandsRow({
  kits,
  activeId,
  onSelect,
  onNew,
  onEdit,
  onDelete,
}: {
  kits: BrandKit[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (kits.length === 0) {
    return (
      <section className="mb-6">
        <SectionHeader count={0} />
        <button
          type="button"
          onClick={onNew}
          className="w-full rounded-2xl border border-dashed border-border/60 bg-secondary/10 hover:border-[#F5A524]/60 hover:bg-[#F5A524]/5 transition-all px-5 py-6 flex items-center justify-between gap-4 text-left group"
        >
          <div>
            <p className="text-sm font-medium text-foreground">Add your first brand</p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll reuse the logo, tagline & description on every ad.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#F5A524] text-black text-xs font-semibold group-hover:bg-[#F5A524]/90">
            <Plus className="w-3.5 h-3.5" />
            New brand
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <SectionHeader count={kits.length} />
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {kits.map((k) => {
          const active = k.id === activeId;
          return (
            <div
              key={k.id}
              className={cn(
                "group relative shrink-0 w-[180px] rounded-2xl border bg-[hsl(240_5%_8%)]/70 backdrop-blur transition-all",
                active
                  ? "border-[#F5A524] shadow-[0_0_0_1px_hsl(35_90%_55%/0.3)]"
                  : "border-border/60 hover:border-[#F5A524]/50",
              )}
            >
              <button
                type="button"
                onClick={() => k.id && onSelect(k.id)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-lg border border-border/50 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                  {k.logo_url ? (
                    <img src={k.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {k.name || "Untitled"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                    {k.subject}
                  </div>
                </div>
              </button>

              {active && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#F5A524] text-black flex items-center justify-center shadow-md">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </div>
              )}

              <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    k.id && onEdit(k.id);
                  }}
                  className="w-6 h-6 rounded-md bg-background/80 backdrop-blur border border-border/60 text-muted-foreground hover:text-foreground flex items-center justify-center"
                  aria-label="Edit"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    k.id && onDelete(k.id);
                  }}
                  className="w-6 h-6 rounded-md bg-background/80 backdrop-blur border border-border/60 text-muted-foreground hover:text-destructive flex items-center justify-center"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* New brand tile */}
        <button
          type="button"
          onClick={onNew}
          className="shrink-0 w-[140px] rounded-2xl border border-dashed border-border/60 bg-secondary/10 hover:border-[#F5A524]/60 hover:bg-[#F5A524]/5 transition-all p-3 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium">New brand</span>
        </button>
      </div>
    </section>
  );
}

function SectionHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
        Your brands
      </h2>
      {count > 0 && (
        <span className="text-[10px] text-muted-foreground/70 tabular-nums">
          {count} saved
        </span>
      )}
    </div>
  );
}
