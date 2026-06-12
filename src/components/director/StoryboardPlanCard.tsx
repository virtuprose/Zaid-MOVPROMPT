// StoryboardPlanCard — chat bubble that shows the structured shot plan returned
// by plan-storyboard. The user can edit each beat inline, regenerate a single
// beat, then approve the whole plan to render the panels.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pencil, Sparkles, Trash2, Check, X } from "lucide-react";
import type { StoryboardPlan, StoryboardPlanShot } from "@/lib/director/planStoryboard";

export type StoryboardPlanCardProps = {
  plan: StoryboardPlan;
  onChange: (next: StoryboardPlan) => void;
  onApprove: (plan: StoryboardPlan) => void;
  onDiscard: () => void;
  onRegenerateBeat?: (index: number) => void;
  busy?: boolean;
};

export function StoryboardPlanCard({
  plan,
  onChange,
  onApprove,
  onDiscard,
  onRegenerateBeat,
  busy,
}: StoryboardPlanCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateShot = (i: number, patch: Partial<StoryboardPlanShot>) => {
    const next = { ...plan, shots: plan.shots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) };
    onChange(next);
  };

  const deleteShot = (i: number) => {
    onChange({ ...plan, shots: plan.shots.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-background/60 backdrop-blur p-4 md:p-5 shadow-[0_0_32px_-12px_hsl(var(--primary)/0.4)] space-y-4">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Storyboard plan</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
            {plan.shots.length} shot{plan.shots.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {plan.shared_style && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground/80 font-medium">Style:</span> {plan.shared_style}
          </p>
        )}
        {plan.grammar_note && (
          <p className="text-xs text-muted-foreground/90 leading-relaxed italic">
            {plan.grammar_note}
          </p>
        )}
      </header>

      <ol className="space-y-2.5">
        {plan.shots.map((shot, i) => {
          const isEditing = editingIndex === i;
          return (
            <li
              key={i}
              className={cn(
                "rounded-xl border bg-muted/20 p-3 transition-colors",
                isEditing ? "border-primary/60 bg-primary/5" : "border-border/40 hover:border-border",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 space-y-2">
                  {isEditing ? (
                    <Input
                      value={shot.title}
                      onChange={(e) => updateShot(i, { title: e.target.value })}
                      className="h-7 text-sm font-medium"
                      placeholder="Shot title"
                    />
                  ) : (
                    <h4 className="text-sm font-medium text-foreground truncate">{shot.title || `Shot ${i + 1}`}</h4>
                  )}
                  {isEditing ? (
                    <Textarea
                      value={shot.beat}
                      onChange={(e) => updateShot(i, { beat: e.target.value })}
                      rows={3}
                      className="text-xs resize-none"
                      placeholder="Describe the action and framing"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">{shot.beat}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {shot.shot_type && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{shot.shot_type}</Badge>}
                    {shot.camera_move && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{shot.camera_move}</Badge>}
                    {shot.lens && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{shot.lens}</Badge>}
                    {shot.lighting && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 max-w-[180px] truncate">{shot.lighting}</Badge>}
                    {shot.mood && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{shot.mood}</Badge>}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col gap-1">
                  {isEditing ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingIndex(null)}
                      aria-label="Done editing"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingIndex(i)}
                      aria-label="Edit shot"
                      disabled={busy}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onRegenerateBeat && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onRegenerateBeat(i)}
                      aria-label="Rewrite with AI"
                      disabled={busy}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {plan.shots.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteShot(i)}
                      aria-label="Delete shot"
                      disabled={busy}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="flex items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={busy}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          Discard
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onApprove(plan)}
          disabled={busy || plan.shots.length === 0}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Check className="w-3.5 h-3.5 mr-1.5" />
          Approve &amp; generate {plan.shots.length} panel{plan.shots.length === 1 ? "" : "s"}
        </Button>
      </footer>
    </div>
  );
}
