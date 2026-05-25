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

type Tone = "brand" | "primary" | "muted";

const TONE: Record<Tone, { chip: string; chipHover: string }> = {
  brand: {
    chip: "bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))]",
    chipHover: "group-hover:bg-[hsl(var(--brand))] group-hover:text-[hsl(var(--brand-foreground))]",
  },
  primary: {
    chip: "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]",
    chipHover:
      "group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-foreground))]",
  },
  muted: {
    chip: "bg-foreground/5 text-foreground/60",
    chipHover: "group-hover:bg-foreground/15 group-hover:text-foreground",
  },
};

const BORDER: Record<Tone, string> = {
  brand: "hover:border-[hsl(var(--brand)/0.5)]",
  primary: "hover:border-[hsl(var(--primary)/0.5)]",
  muted: "hover:border-foreground/20",
};

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

  const actions: Array<{
    key: string;
    label: string;
    icon: typeof Film;
    disabled: boolean;
    tone: Tone;
    onClick: () => void;
  }> = [
    {
      key: "storyboard",
      label: "Build storyboard",
      icon: Film,
      disabled: !hasImages,
      tone: "brand",
      onClick: () => emit("prefill", { text: "Build a multi-shot storyboard from this." }),
    },
    {
      key: "animate",
      label: "Animate last frame",
      icon: Wand2,
      disabled: !hasImages,
      tone: "brand",
      onClick: () => emit("prefill", { text: "Animate the last frame." }),
    },
    {
      key: "variants",
      label: "Generate variants",
      icon: Shuffle,
      disabled: !hasImages,
      tone: "brand",
      onClick: () => emit("prefill", { text: "Generate 3 variants of the last frame." }),
    },
    {
      key: "export",
      label: "Export prompts",
      icon: Download,
      disabled: !hasMessages,
      tone: "primary",
      onClick: exportPrompts,
    },
    {
      key: "new",
      label: "New task",
      icon: Plus,
      disabled: false,
      tone: "muted",
      onClick: () => navigate("/director"),
    },
  ];

  return (
    <RailSection id="quick-actions" title="Quick Actions" accent="brand">
      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ key, label, icon: Icon, disabled, tone, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "group flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-[hsl(var(--card))] p-3 transition-all",
              BORDER[tone],
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/5",
            )}
          >
            <span
              className={cn(
                "p-2 rounded-lg transition-colors",
                TONE[tone].chip,
                !disabled && TONE[tone].chipHover,
              )}
            >
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-medium text-foreground/70 text-center leading-tight">
              {label}
            </span>
          </button>
        ))}
      </div>
    </RailSection>
  );
}
