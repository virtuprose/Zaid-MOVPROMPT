import { UserRound, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CharacterKit } from "@/lib/marketing/characterKit";

export function CharacterPickerPopover({
  kits,
  activeId,
  onSelect,
  onNew,
  onEdit,
  onDelete,
  trigger,
}: {
  kits: CharacterKit[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  trigger: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Your characters
        </div>

        {kits.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No characters yet. Create your first one below.
          </div>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {kits.map((k) => {
              const active = k.id === activeId;
              return (
                <li key={k.id} className="group flex items-stretch">
                  <button
                    type="button"
                    onClick={() => k.id && onSelect(k.id)}
                    className={cn(
                      "flex-1 flex items-center gap-2.5 px-2 py-2 rounded-l-lg text-left text-sm transition-colors",
                      active
                        ? "bg-[hsl(0_72%_55%)]/10 border border-[hsl(0_72%_55%)]/40"
                        : "hover:bg-muted/40 border border-transparent",
                    )}
                  >
                    <div className="w-8 h-8 rounded-full border border-border/50 bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                      {k.reference_url ? (
                        <img src={k.reference_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-foreground">{k.name || "Untitled"}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                        {k.role || "Character"}
                      </div>
                    </div>
                    {active && <Check className="w-3.5 h-3.5 text-[#F5A524] shrink-0" />}
                  </button>
                  <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => k.id && onEdit(k.id)}
                      className="px-2 py-1 text-muted-foreground hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => k.id && onDelete(k.id)}
                      className="px-2 py-1 text-muted-foreground hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2 pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onNew}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-muted/40 text-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            New character
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
