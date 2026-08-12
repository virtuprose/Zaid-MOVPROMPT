import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFeatureEnabled } from "@/config/features";
import { portableCreatorApi } from "@/lib/api/portableApiClient";
import { CREATOR_TEMPLATES } from "./templates";
import type { CreatorTemplate } from "./types";
import { creatorTemplateFromCatalog } from "./templateCatalogMapper";

export function TemplateGrid({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect: (templateId: string) => void;
}) {
  const [templates, setTemplates] = useState<CreatorTemplate[]>(CREATOR_TEMPLATES);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "fallback">(
    isFeatureEnabled("portableAuth") ? "loading" : "fallback",
  );

  useEffect(() => {
    if (!isFeatureEnabled("portableAuth")) return;
    let active = true;
    void portableCreatorApi.listTemplates().then((published) => {
      if (!active || !published.length) {
        if (active) setCatalogState("fallback");
        return;
      }
      const merged = published.map(creatorTemplateFromCatalog);
      setTemplates(merged);
      setCatalogState("ready");
    }).catch(() => {
      if (active) setCatalogState("fallback");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId && !templates.some((template) => template.id === selectedId)) {
      void portableCreatorApi.getTemplate(selectedId).then((published) => {
        setTemplates((current) => [creatorTemplateFromCatalog(published), ...current]);
      }).catch(() => undefined);
    }
  }, [selectedId, templates]);

  return (
    <>
      {catalogState === "loading" && <p className="creator-catalog-status" role="status">Loading published templates…</p>}
      {catalogState === "fallback" && isFeatureEnabled("portableAuth") && (
        <p className="creator-catalog-status" role="status">Showing local previews while the published catalog reconnects.</p>
      )}
      <div className="creator-template-grid" aria-busy={catalogState === "loading"}>
        {templates.map((template) => <TemplateCard key={template.id} template={template} selected={selectedId === template.id} onSelect={onSelect} />)}
      </div>
    </>
  );
}

function TemplateCard({ template, selected, onSelect }: { template: CreatorTemplate; selected: boolean; onSelect: (templateId: string) => void; }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const play = () => { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) void videoRef.current?.play().catch(() => undefined); };
  const stop = () => { const video = videoRef.current; if (!video) return; video.pause(); video.currentTime = 0; };
  return (
        <button
          type="button"
          className={cn("creator-template-card", selected && "is-selected")}
          onClick={() => onSelect(template.id)}
          onMouseEnter={play}
          onMouseLeave={stop}
          onFocus={play}
          onBlur={stop}
          aria-pressed={selected}
        >
          <div className="creator-template-media">
            <img src={template.poster} alt="" loading="lazy" />
            <video ref={videoRef} src={template.previewVideo} muted loop playsInline preload="none" aria-hidden="true" />
            <span className="creator-template-duration">{template.duration}s</span>
          </div>
          <div className="creator-template-copy">
            <span className="creator-template-eyebrow">{template.eyebrow}</span>
            <h2>{template.name}</h2>
            <p>{template.description}</p>
            <div className="creator-template-meta">
              <span><strong>{template.scenes.length} scenes</strong> · Arabic + English</span>
              {selected ? <Check aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
            </div>
          </div>
        </button>
  );
}
