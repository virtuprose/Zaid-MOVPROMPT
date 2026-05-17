import * as React from "react";
import {
  Package,
  Plus,
  X,
  Sparkles,
  Globe,
  SlidersHorizontal,
  Wand2,
  ChevronDown,
  Loader2,
} from "lucide-react";

export type AdBuilderChip = {
  id: string;
  label: string;
  avatar?: string;
};

export interface AdBuilderPanelProps {
  chips: AdBuilderChip[];
  onAddChip: () => void;
  onRemoveChip: (id: string) => void;
  onPickFormat: () => void;
  onPickLocation: () => void;
  onGenerate: () => void;
  /** Optional fully-styled advanced settings trigger (e.g. a Popover wrapper). If omitted, falls back to onOpenAdvanced. */
  advancedSlot?: React.ReactNode;
  onOpenAdvanced?: () => void;
  formatLabel?: string;
  locationLabel?: string;
  generateDisabled?: boolean;
  generating?: boolean;
  generateLabel?: string;
}

/** Class used for the Advanced settings trigger so external popovers can reuse the exact spec styling. */
export const AD_BUILDER_ADVANCED_BTN_CLASS =
  "w-9 h-9 rounded-lg bg-[#1A1A1C] border border-white/[0.08] text-white/50 flex items-center justify-center transition-colors hover:border-white/15 hover:text-white/80";

const dropdownBtnClass =
  "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1A1A1C] border border-white/[0.08] text-[13px] font-medium text-[#FAFAFA] transition-colors hover:border-white/15";

export function AdBuilderPanel({
  chips,
  onAddChip,
  onRemoveChip,
  onPickFormat,
  onPickLocation,
  onGenerate,
  advancedSlot,
  onOpenAdvanced,
  formatLabel = "Format",
  locationLabel = "Location",
  generateDisabled = false,
  generating = false,
  generateLabel = "Generate ad",
}: AdBuilderPanelProps) {
  return (
    <div className="w-full max-w-[900px] mx-auto">
      <p className="text-center text-[13px] text-white/45 mb-5">
        Pick a format and a location. We compose the prompt and render your ad.
      </p>

      <div className="rounded-2xl bg-[#0F0F10] border border-white/[0.06] p-5 flex flex-col gap-4">
        {/* Row 1 — Product selection */}
        <div className="flex items-stretch gap-3">
          <div className="w-[72px] h-[72px] shrink-0 rounded-[10px] bg-[#1A1A1C] border border-white/[0.08] flex flex-col items-center justify-center">
            <Package className="text-white/70" size={22} />
            <span className="mt-1.5 text-[11px] font-medium text-white/70 leading-none">
              Product
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2 self-center">
            {chips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-2 pl-[5px] pr-2.5 py-[5px] rounded-full bg-[#1A1A1C] border border-white/[0.08] text-[13px]"
              >
                <span className="w-[22px] h-[22px] rounded-full bg-[#2A2A2C] overflow-hidden flex items-center justify-center shrink-0">
                  {chip.avatar ? (
                    <img
                      src={chip.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-white/70 leading-none">
                      {chip.label.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="font-medium text-[#FAFAFA] truncate max-w-[140px]">
                  {chip.label}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.id)}
                  aria-label={`Remove ${chip.label}`}
                  className="w-4 h-4 rounded-full text-white/40 flex items-center justify-center transition-colors hover:bg-white/[0.08]"
                >
                  <X size={13} />
                </button>
              </span>
            ))}

            <button
              type="button"
              onClick={onAddChip}
              aria-label="Add"
              className="w-7 h-7 rounded-full border border-dashed border-white/15 text-white/40 flex items-center justify-center transition-colors hover:border-solid hover:border-white/25"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="h-px bg-white/[0.05]" />

        {/* Row 2 — Controls */}
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onPickFormat} className={dropdownBtnClass}>
            <Sparkles size={15} className="text-white/50" />
            <span>{formatLabel}</span>
            <ChevronDown size={13} className="text-white/35 ml-0.5" />
          </button>

          <button type="button" onClick={onPickLocation} className={dropdownBtnClass}>
            <Globe size={15} className="text-white/50" />
            <span>{locationLabel}</span>
            <ChevronDown size={13} className="text-white/35 ml-0.5" />
          </button>

          {advancedSlot ?? (
            <button
              type="button"
              onClick={onOpenAdvanced}
              aria-label="Advanced settings"
              className={AD_BUILDER_ADVANCED_BTN_CLASS}
            >
              <SlidersHorizontal size={16} />
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={onGenerate}
            disabled={generateDisabled}
            className="inline-flex items-center gap-2 px-[18px] py-[9px] rounded-lg bg-[#EF9F27] text-[#412402] text-[14px] font-medium transition-colors hover:bg-[#F0A93A] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            <span>{generateLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
