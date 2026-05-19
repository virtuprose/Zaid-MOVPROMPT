import { cn } from "@/lib/utils";
import logoMark from "@/assets/logo-mark-white.svg";

export type AvatarState = "idle" | "thinking" | "listening" | "success" | "scanning" | "nod";

type Props = {
  state?: AvatarState;
  size?: "sm" | "md";
  className?: string;
};

const sizeMap = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
};

export function AssistantAvatar({ state = "idle", size = "md", className }: Props) {
  const isThinking = state === "thinking";
  const isListening = state === "listening";
  const isSuccess = state === "success";
  const isScanning = state === "scanning";
  const isNod = state === "nod";

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full",
        "bg-gradient-to-br from-primary/25 to-accent/15 ring-1 ring-primary/30",
        sizeMap[size],
        "motion-safe:transition-transform",
        isNod && "motion-safe:animate-nod",
        isSuccess && "ring-2 ring-primary shadow-[0_0_18px_hsl(var(--primary)/0.55)]",
        className,
      )}
      aria-hidden
    >
      {/* breathing halo */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full motion-safe:animate-breath",
          "bg-primary/25 blur-md",
          isThinking && "motion-safe:[animation-duration:1.4s] bg-primary/40",
          isListening && "bg-accent/35",
          isScanning && "bg-accent/40 motion-safe:[animation-duration:1s]",
        )}
      />
      {/* scanning sweep ring */}
      {isScanning && (
        <span className="pointer-events-none absolute inset-[-3px] rounded-full border border-accent/70 motion-safe:animate-ping" />
      )}
      <img
        src={logoMark}
        alt=""
        className={cn(
          "relative z-10 h-[60%] w-[60%] object-contain",
          "drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]",
        )}
      />
    </div>
  );
}
