import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// Loose bubble type — the rail only reads role + data.
export type RailBubble = any;

type Ctx = {
  bubbles: RailBubble[];
  setBubbles: (b: RailBubble[]) => void;
};

const MediaRailCtx = createContext<Ctx | null>(null);

export function MediaRailProvider({ children }: { children: ReactNode }) {
  const [bubbles, setBubbles] = useState<RailBubble[]>([]);
  const value = useMemo(() => ({ bubbles, setBubbles }), [bubbles]);
  return <MediaRailCtx.Provider value={value}>{children}</MediaRailCtx.Provider>;
}

export function useMediaRail() {
  return useContext(MediaRailCtx);
}
