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
    <div className="relative">
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-lg overflow-hidden border border-border bg-muted/30"
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
            className={`flex flex-col items-center justify-center gap-2 sm:gap-3 p-5 sm:p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300 min-h-[180px] sm:aspect-video ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-secondary/50"
            }`}
          >
            <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
            <div className="p-3 rounded-full bg-secondary">
              {isDragging ? <ImageIcon className="w-6 h-6 text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or click to upload</p>
            </div>
          </motion.label>
        )}
      </AnimatePresence>
    </div>
  );
};
