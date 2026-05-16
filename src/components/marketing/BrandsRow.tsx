import { ArrowRight, Building2, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrandKit } from "@/lib/marketing/brandKit";

export function BrandsRow({
  kits,
  activeId,
  onSelect,
  onNew,
  onEdit,
  onDelete,
  onManageAll,
}: {
  kits: BrandKit[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onManageAll?: () => void;
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
      <SectionHeader count={kits.length} onManageAll={onManageAll} />
      <div className="relative">
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]"
        >
          {kits.map((k) => {
            const active = k.id === activeId;
            return (
              <div
                key={k.id}
                className={cn(
                  "group relative snap-start shrink-0 w-[200px] h-[84px] rounded-2xl border bg-[hsl(240_5%_8%)]/70 backdrop-blur transition-all overflow-hidden hover:scale-[1.02]",
                  active
                    ? "border-[#F5A524] ring-1 ring-[#F5A524]/40 scale-[1.02]"
                    : "border-border/60 hover:border-[#F5A524]/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => k.id && onSelect(k.id)}
                  className="w-full h-full text-left p-3 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-lg border border-border/40 bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                    {k.logo_url ? (
                      <img
                        src={k.logo_url}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {k.name || "Untitled"}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      {k.subject}
                    </div>
                  </div>
                  {active && (
                    <div className="w-5 h-5 rounded-full bg-[#F5A524] text-black flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </div>
                  )}
                </button>

                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      k.id && onEdit(k.id);
                    }}
                    className="w-6 h-6 rounded-md bg-background/90 backdrop-blur border border-border/60 text-muted-foreground hover:text-foreground flex items-center justify-center"
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
                    className="w-6 h-6 rounded-md bg-background/90 backdrop-blur border border-border/60 text-muted-foreground hover:text-destructive flex items-center justify-center"
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
            className="snap-start shrink-0 w-[140px] h-[84px] rounded-2xl border border-dashed border-border/60 bg-secondary/10 hover:border-[#F5A524]/60 hover:bg-[#F5A524]/5 transition-all flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">New brand</span>
          </button>
        </div>
        {kits.length >= 5 && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
          </>
        )}
      </div>
    </section>
  );
}

function SectionHeader({ count, onManageAll }: { count: number; onManageAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
        Your brands
      </h2>
      {count > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
          <span className="tabular-nums">{count} saved</span>
          {onManageAll && (
            <>
              <span className="opacity-40">·</span>
              <button
                type="button"
                onClick={onManageAll}
                className="inline-flex items-center gap-1 uppercase tracking-wider font-medium text-muted-foreground hover:text-[#F5A524] transition-colors"
              >
                Manage all
                <ArrowRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
