import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Film, Wand2, Shuffle, Download, Plus } from "lucide-react";
import { RailSection } from "./RailSection";
import { cn } from "@/lib/utils";

interface QuickActionsCardProps {
  hasMessages: boolean;
  hasImages: boolean;
  hasStoryboard: boolean;
  messages: any[];
}

function emit(action: string, payload?: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent("director:quick-action", { detail: { action, ...payload } }));
}

export function QuickActionsCard({ hasMessages, hasImages, hasStoryboard, messages }: QuickActionsCardProps) {
  const navigate = useNavigate();

  const exportPrompts = () => {
    const lines: string[] = [];
    for (const m of messages) {
      if (m?.role === "user" && typeof m.content === "string" && m.content.trim()) {
        lines.push(`You: ${m.content.trim()}`);
      } else if (m?.role === "assistant" && typeof m.content === "string" && m.content.trim()) {
        lines.push(`Director: ${m.content.trim()}`);
      } else if (m?.data?.prompt) {
        lines.push(`PROMPT: ${m.data.prompt}`);
      }
    }
    if (lines.length === 0) {
      toast.info("Nothing to export yet.");
      return;
    }
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movprompt-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Session exported");
  };

  const actions = [
    {
      key: "storyboard",
      label: "Build storyboard",
      icon: Film,
      disabled: !hasImages,
      onClick: () => emit("prefill", { text: "Build a multi-shot storyboard from this." }),
    },
    {
      key: "animate",
      label: "Animate last frame",
      icon: Wand2,
      disabled: !hasImages,
      onClick: () => emit("prefill", { text: "Animate the last frame." }),
    },
    {
      key: "variants",
      label: "Generate variants",
      icon: Shuffle,
      disabled: !hasImages,
      onClick: () => emit("prefill", { text: "Generate 3 variants of the last frame." }),
    },
    {
      key: "export",
      label: "Export prompts",
      icon: Download,
      disabled: !hasMessages,
      onClick: exportPrompts,
    },
    {
      key: "new",
      label: "New task",
      icon: Plus,
      disabled: false,
      onClick: () => navigate("/director"),
    },
  ];

  return (
    <RailSection id="quick-actions" title="Quick Actions" icon={<Wand2 className="w-3.5 h-3.5" />}>
      <div className="grid grid-cols-2 gap-1.5">
        {actions.map(({ key, label, icon: Icon, disabled, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-[11px] text-foreground/80 transition-all",
              "hover:border-primary/40 hover:bg-primary/10 hover:text-foreground",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background/40 disabled:hover:border-border/40",
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </RailSection>
  );
}
