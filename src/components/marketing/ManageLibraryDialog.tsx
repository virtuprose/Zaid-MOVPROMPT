import { useMemo, useState } from "react";
import { Building2, Check, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LibraryItem = {
  id?: string;
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

type Kind = "brand" | "character";

export function ManageLibraryDialog({
  open,
  onOpenChange,
  kind,
  items,
  activeId,
  onSelect,
  onNew,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: Kind;
  items: LibraryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((it) => {
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        (it.subtitle ?? "").toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      const ad = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bd = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bd - ad;
    });
  }, [items, query, sort]);

  const labelPlural = kind === "brand" ? "Brands" : "Characters";
  const labelSingular = kind === "brand" ? "brand" : "character";
  const Icon = kind === "brand" ? Building2 : UserRound;
  const thumbRadius = kind === "brand" ? "rounded-lg" : "rounded-full";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden border-border/60 bg-[hsl(240_5%_8%)]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-semibold">
                Your {labelPlural}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {items.length} saved
              </p>
            </div>
            <Button
              type="button"
              onClick={onNew}
              className="h-9 rounded-full bg-[#F5A524] hover:bg-[#F5A524]/90 text-black text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New {labelSingular}
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${labelPlural.toLowerCase()}…`}
                className="h-9 pl-9 text-sm bg-background/60"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as "recent" | "name")}>
              <SelectTrigger className="h-9 w-[140px] text-xs bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Icon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {query
                    ? "No matches. Try a different search."
                    : `Save your first ${labelSingular} to reuse it across every ad.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map((it) => {
                  const active = it.id === activeId;
                  return (
                    <div
                      key={it.id}
                      className={cn(
                        "group relative rounded-2xl border bg-[hsl(240_5%_10%)] transition-all overflow-hidden",
                        active
                          ? "border-[#F5A524] ring-1 ring-[#F5A524]/40"
                          : "border-border/60 hover:border-[#F5A524]/50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => it.id && onSelect(it.id)}
                        className="w-full text-left p-4 flex flex-col items-center gap-3"
                      >
                        <div
                          className={cn(
                            "w-20 h-20 border border-border/40 bg-white/5 overflow-hidden flex items-center justify-center",
                            thumbRadius,
                          )}
                        >
                          {it.imageUrl ? (
                            <img
                              src={it.imageUrl}
                              alt=""
                              className={cn(
                                "w-full h-full",
                                kind === "brand" ? "object-contain" : "object-cover",
                              )}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Icon className="w-7 h-7 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 w-full text-center">
                          <div className="truncate text-sm font-medium text-foreground">
                            {it.name || "Untitled"}
                          </div>
                          {it.subtitle && (
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 truncate">
                              {it.subtitle}
                            </div>
                          )}
                        </div>
                      </button>

                      {active && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F5A524] text-black flex items-center justify-center shadow">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                      )}

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            it.id && onEdit(it.id);
                          }}
                          className="h-7 px-2 rounded-md bg-background/90 backdrop-blur border border-border/60 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            it.id && onDelete(it.id);
                          }}
                          className="h-7 w-7 rounded-md bg-background/90 backdrop-blur border border-border/60 text-muted-foreground hover:text-destructive inline-flex items-center justify-center"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40 bg-background/40">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
