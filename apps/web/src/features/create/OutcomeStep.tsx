import type { CampaignGoal } from "@movprompt/contracts";

import { cn } from "@/lib/utils";
import { CAMPAIGN_GOAL_OPTIONS } from "./types";

const ARABIC_OUTCOMES: Record<CampaignGoal, string> = {
  whatsapp_orders: "الحصول على طلبات واتساب",
  bookings: "الحصول على حجوزات",
  launch: "إطلاق شيء جديد",
  offer: "الترويج لعرض",
  demonstration: "شرح المنتج أو الخدمة",
  education: "شرح فكرة مفيدة",
  announcement: "إعلان خبر مهم",
  trust: "بناء الثقة",
  brand_story: "رواية قصة العلامة التجارية",
};

export function OutcomeStep({
  value,
  onChange,
  arabic = false,
}: {
  value: CampaignGoal;
  onChange: (goal: CampaignGoal) => void;
  arabic?: boolean;
}) {
  const heading = arabic ? "ماذا تريد أن تحقق هذه الحملة؟" : "What do you want this campaign to do?";
  return (
    <fieldset className="creator-outcome-step">
      <legend>{heading}</legend>
      <p>{arabic ? "اختر نتيجة واحدة. سنعرض قوالب مناسبة بناءً على التفاصيل التي أكّدتها." : "Choose one result. We’ll show templates that match the details you confirmed."}</p>
      <div className="creator-outcome-grid" role="radiogroup" aria-label={heading}>
        {CAMPAIGN_GOAL_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              className={cn("creator-outcome-option", selected && "is-selected")}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
            >
              <span>{arabic ? ARABIC_OUTCOMES[option.value] : option.label}</span>
              <small>{selected ? (arabic ? "تم الاختيار" : "Selected") : (arabic ? "اختر النتيجة" : "Choose result")}</small>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
