import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreatorTemplate } from "./types";

export function TemplatePreviewDialog({
  template,
  locale,
  onOpenChange,
}: {
  template: CreatorTemplate | null;
  locale: "en" | "ar";
  onOpenChange: (open: boolean) => void;
}) {
  const ar = locale === "ar";
  const name = template ? (ar ? template.nameAr : template.name) : "";

  return (
    <Dialog open={Boolean(template)} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={ar ? "إغلاق المعاينة" : "Close preview"}
        className="max-w-4xl gap-4 border-border/70 bg-background p-4 sm:p-6"
      >
        <DialogHeader className="pe-10 text-start">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>
            {ar
              ? "معاينة حركة حقيقية من مكتبة الإنتاج الحالية. منتجك ونصك لا يظهران إلا بعد توليد حملتك."
              : "A verified motion preview from the current production library. Your product and copy appear only after your campaign is generated."}
          </DialogDescription>
        </DialogHeader>
        {template?.previewVideo && (
          <div className="grid max-h-[68dvh] min-h-[260px] place-items-center overflow-hidden rounded-xl bg-black">
            <video
              key={template.previewVideo}
              src={template.previewVideo}
              poster={template.poster}
              autoPlay
              muted
              controls
              playsInline
              preload="metadata"
              className="max-h-[68dvh] w-full object-contain"
              aria-label={ar ? `معاينة فيديو لقالب ${name}` : `${name} video preview`}
            />
          </div>
        )}
        {template && (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-105"
            to={`/create?template=${encodeURIComponent(template.id)}`}
          >
            {ar ? "استخدم هذا القالب" : "Use this template"}
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}
