import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadZoneProps {
  label: string;
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  preview: string | null;
}

export const ImageUploadZone = ({ label, onImageSelect, onImageRemove, preview }: ImageUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) onImageSelect(file);
  }, [onImageSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageSelect(file);
  }, [onImageSelect]);

  return (
    <div className="relative" data-tour="image-upload">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden border border-border bg-muted/30"
          >
            <img src={preview} alt={label} className="w-full max-h-[250px] sm:max-h-[400px] object-contain" />
            <button
              onClick={onImageRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </motion.div>
        ) : (
          <motion.label
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`upload-zone-empty group flex flex-col items-center justify-center gap-3 p-5 sm:p-8 rounded-xl cursor-pointer transition-all duration-200 min-h-[180px] sm:aspect-video ${
              isDragging ? "upload-zone-dragging" : "upload-zone-idle"
            }`}
          >
            <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
            {isDragging ? (
              <ImageIcon style={{ width: 48, height: 48, color: "#00D4FF" }} />
            ) : (
              <Upload style={{ width: 48, height: 48, color: "#00D4FF" }} />
            )}
            <div className="text-center">
              {isDragging ? (
                <p style={{ fontSize: 16, color: "#00D4FF", fontWeight: 600 }}>
                  {t("upload.release" as any)}
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 16, color: "#F0F0F5", fontWeight: 600 }}>
                    {t("upload.title" as any)}
                  </p>
                  <p style={{ fontSize: 12, color: "#8888AA", marginTop: 4 }}>
                    {t("upload.subtitle" as any)}
                  </p>
                </>
              )}
            </div>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
};
