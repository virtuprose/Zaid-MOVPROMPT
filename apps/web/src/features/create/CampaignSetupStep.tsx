import { useEffect, useId, useMemo, useState } from "react";

import type { CreatorAspectRatio, CreatorLanguage, CreatorProject, CreatorResolution } from "./types";
import { PresenterChoice, type PresenterCompatibility } from "./PresenterChoice";
import {
  CTA_BY_GOAL,
  deliveryFieldsFor,
  normalizeKwdAmount,
  validateCampaignSetup,
  type CampaignSetupField,
} from "./campaignSetupRules";

type QuoteState = "ready" | "loading" | "unavailable" | "expired" | "changed";

type CampaignSetupStepProps = {
  project: CreatorProject;
  quoteState: QuoteState;
  onChange: (changes: Partial<CreatorProject>, field: CampaignSetupField) => void;
  onContinue: () => void;
  presenterCompatibility?: PresenterCompatibility;
  arabic?: boolean;
};

const CTA_OPTIONS = ["Shop now", "Order on WhatsApp", "Book now", "Learn more", "Visit store"];
const RATIOS: CreatorAspectRatio[] = ["9:16", "1:1", "4:5", "16:9"];

function copy(arabic: boolean, english: string, arabicText: string) {
  return arabic ? arabicText : english;
}

export function CampaignSetupStep({
  project,
  quoteState,
  onChange,
  onContinue,
  presenterCompatibility = { aiUgc: false, uploadedSpokesperson: false },
  arabic = false,
}: CampaignSetupStepProps) {
  const [localQuoteRefresh, setLocalQuoteRefresh] = useState(false);
  const [errors, setErrors] = useState<ReturnType<typeof validateCampaignSetup>>({});
  const errorSummaryId = useId();
  const delivery = deliveryFieldsFor(project.goal);
  const presenter = project.presenter ?? (project.presenterMode === "ai_ugc" ? { mode: "ai_ugc" as const } : { mode: "none" as const });
  const effectiveQuoteState = localQuoteRefresh && quoteState === "ready" ? "loading" : quoteState;
  const activeErrors = useMemo(() => Object.values(errors).filter(Boolean), [errors]);

  // A configuration edit is pending only until the quote hook reports its next state.
  // Without this reset, a previous ready quote leaves the UI in a permanent loading state.
  useEffect(() => {
    setLocalQuoteRefresh(false);
  }, [quoteState]);

  const apply = (field: CampaignSetupField, changes: Partial<CreatorProject>) => {
    setLocalQuoteRefresh(true);
    onChange(changes, field);
  };

  const continueToReview = () => {
    const nextErrors = validateCampaignSetup(project);
    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      document.getElementById(`campaign-${firstInvalid}`)?.focus();
      return;
    }
    onContinue();
  };

  return (
    <div className="creator-campaign-setup" dir={arabic ? "rtl" : undefined}>
      <div className="creator-campaign-setup-head">
        <div>
          <p className="creator-kicker">{copy(arabic, "Final details", "التفاصيل الأخيرة")}</p>
          <h2>{copy(arabic, "Set up your campaign", "جهّز حملتك")}</h2>
          <p>{copy(arabic, "Choose only the details your customer will see. Your source facts stay unchanged.", "اختر فقط التفاصيل التي راح يشوفها العميل. معلومات المصدر تبقى مثل ما هي.")}</p>
        </div>
        <div className="creator-setup-complete-summary" aria-label={copy(arabic, "Completed campaign settings", "إعدادات الحملة المكتملة")}>
          <span>{copy(arabic, "Kuwait", "الكويت")}</span>
          <span>{project.language === "bilingual" ? copy(arabic, "Arabic + English", "عربي + إنجليزي") : project.language === "ar" ? copy(arabic, "Arabic", "عربي") : copy(arabic, "English", "إنجليزي")}</span>
          <span>{project.aspectRatio}</span>
        </div>
      </div>

      {activeErrors.length > 0 && (
        <div className="creator-campaign-error-summary" id={errorSummaryId} role="alert" tabIndex={-1}>
          <strong>{copy(arabic, "Check the highlighted details", "راجع التفاصيل المحددة")}</strong>
          <span>{activeErrors[0]}</span>
        </div>
      )}

      <section className="creator-campaign-section" aria-labelledby="campaign-presenter-heading">
        <div className="creator-campaign-section-head">
          <span>01</span>
          <div><h3 id="campaign-presenter-heading">{copy(arabic, "Who appears?", "من يظهر في الفيديو؟")}</h3><p>{copy(arabic, "This version keeps the focus on your product or service.", "هذه النسخة تركز على منتجك أو خدمتك.")}</p></div>
        </div>
        <PresenterChoice
          value={presenter}
          compatibility={presenterCompatibility}
          eligibleFootage={project.product.images}
          onChange={(presenter) => {
            apply("presenter", { presenter, presenterMode: presenter.mode });
          }}
          arabic={arabic}
        />
      </section>

      <section className="creator-campaign-section" aria-labelledby="campaign-audience-heading">
        <div className="creator-campaign-section-head">
          <span>02</span>
          <div><h3 id="campaign-audience-heading">{copy(arabic, "Market and language", "السوق واللغة")}</h3><p>{copy(arabic, "Kuwait is selected for this launch. Your interface language can stay separate.", "الكويت مختارة لهذا الإطلاق. لغة الواجهة تقدر تبقى مختلفة.")}</p></div>
        </div>
        <div className="creator-form-grid">
          <div className="creator-field"><label htmlFor="campaign-market">{copy(arabic, "Market", "السوق")}</label><select id="campaign-market" className="creator-select" value="KW" disabled><option value="KW">{copy(arabic, "Kuwait · KWD", "الكويت · د.ك")}</option></select></div>
          <div className="creator-field"><label htmlFor="campaign-language">{copy(arabic, "Campaign language", "لغة الحملة")}</label><select id="campaign-language" className="creator-select" value={project.language} onChange={(event) => apply("language", { language: event.target.value as CreatorLanguage })}><option value="en">{copy(arabic, "English", "الإنجليزية")}</option><option value="ar">{copy(arabic, "Kuwaiti Arabic", "العربية الكويتية")}</option><option value="bilingual">{copy(arabic, "Arabic + English", "العربية + الإنجليزية")}</option></select><span className="creator-field-help">{project.language === "en" ? copy(arabic, "The campaign copy will be in English.", "نص الحملة راح يكون بالإنجليزية.") : copy(arabic, "Arabic copy uses Kuwait language conventions.", "النص العربي يستخدم أسلوب اللغة الكويتية.")}</span></div>
        </div>
      </section>

      <section className="creator-campaign-section" aria-labelledby="campaign-offer-heading">
        <div className="creator-campaign-section-head"><span>03</span><div><h3 id="campaign-offer-heading">{copy(arabic, "Offer and action", "العرض والإجراء")}</h3><p>{copy(arabic, "Optional values remain saved if you change the campaign result later.", "القيم الاختيارية تظل محفوظة إذا غيّرت نتيجة الحملة لاحقاً.")}</p></div></div>
        <div className="creator-form-grid">
          <div className="creator-field"><label htmlFor="campaign-price">{copy(arabic, "Price", "السعر")}</label><div className="creator-money-input"><input id="campaign-price" className="creator-input" aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? "campaign-price-error" : undefined} inputMode="decimal" value={project.product.price} onBlur={(event) => { const value = normalizeKwdAmount(event.target.value); if (value !== event.target.value) apply("price", { product: { ...project.product, price: value } }); }} onChange={(event) => apply("price", { product: { ...project.product, price: event.target.value } })} placeholder={copy(arabic, "Optional", "اختياري")} /><span>KWD</span></div><span className="creator-field-help">{copy(arabic, "Use up to three decimal places.", "استخدم حتى ثلاث خانات عشرية.")}</span>{errors.price && <p id="campaign-price-error" className="creator-field-error">{errors.price}</p>}</div>
          <div className="creator-field"><label htmlFor="campaign-offer">{copy(arabic, "Offer", "العرض")}</label><input id="campaign-offer" className="creator-input" value={project.offer} onChange={(event) => apply("offer", { offer: event.target.value })} placeholder={copy(arabic, "Optional · e.g. gift with every order", "اختياري · مثلاً هدية مع كل طلب")} /></div>
          <div className="creator-field"><label htmlFor="campaign-cta">{copy(arabic, "Call to action", "الدعوة للإجراء")}</label><select id="campaign-cta" className="creator-select" value={project.cta} onChange={(event) => apply("cta", { cta: event.target.value })}>{CTA_OPTIONS.map((cta) => <option key={cta} value={cta}>{cta === CTA_BY_GOAL[project.goal] ? `${cta} · ${copy(arabic, "recommended", "موصى به")}` : cta}</option>)}</select></div>
        </div>
      </section>

      <section className="creator-campaign-section" aria-labelledby="campaign-delivery-heading">
        <div className="creator-campaign-section-head"><span>04</span><div><h3 id="campaign-delivery-heading">{copy(arabic, "Where should customers go?", "وين يروح العميل؟")}</h3><p>{delivery.showBooking ? copy(arabic, "This booking campaign needs a working booking link.", "حملة الحجز تحتاج رابط حجز يعمل.") : delivery.showWhatsapp ? copy(arabic, "This WhatsApp campaign needs a Kuwait WhatsApp number.", "حملة الواتساب تحتاج رقم واتساب كويتي.") : copy(arabic, "Add a destination when it helps your campaign. Nothing is deleted when this section changes.", "أضف وجهة إذا كانت تفيد حملتك. ما نحذف أي شيء لما يتغير هذا القسم.")}</p></div></div>
        <div className="creator-form-grid">
          {delivery.showBooking && <div className="creator-field"><label htmlFor="campaign-bookingUrl">{copy(arabic, "Booking link", "رابط الحجز")}</label><input id="campaign-bookingUrl" className="creator-input" aria-invalid={Boolean(errors.bookingUrl)} aria-describedby={errors.bookingUrl ? "campaign-bookingUrl-error" : undefined} inputMode="url" value={project.bookingUrl} onChange={(event) => apply("bookingUrl", { bookingUrl: event.target.value })} placeholder="https://…" />{errors.bookingUrl && <p id="campaign-bookingUrl-error" className="creator-field-error">{errors.bookingUrl}</p>}</div>}
          {delivery.showWhatsapp && <div className="creator-field"><label htmlFor="campaign-whatsapp">{copy(arabic, "WhatsApp number", "رقم واتساب")}</label><input id="campaign-whatsapp" className="creator-input" aria-invalid={Boolean(errors.whatsapp)} aria-describedby={errors.whatsapp ? "campaign-whatsapp-error" : undefined} inputMode="tel" dir="ltr" value={project.whatsapp} onChange={(event) => apply("whatsapp", { whatsapp: event.target.value })} placeholder="+965 5000 0000" />{errors.whatsapp && <p id="campaign-whatsapp-error" className="creator-field-error">{errors.whatsapp}</p>}</div>}
          {!delivery.showBooking && !delivery.showWhatsapp && <p className="creator-field-help creator-campaign-preserved">{copy(arabic, "Your saved booking link and WhatsApp number are not shown for this result, but remain with your campaign.", "رابط الحجز ورقم الواتساب المحفوظين ما يظهرون لهذه النتيجة، لكنهم يبقون في حملتك.")}</p>}
        </div>
      </section>

      <section className="creator-campaign-section" aria-labelledby="campaign-delivery-format-heading">
        <div className="creator-campaign-section-head"><span>05</span><div><h3 id="campaign-delivery-format-heading">{copy(arabic, "Delivery", "التسليم")}</h3><p>{copy(arabic, "Choose a social format and quality. You can export other formats later.", "اختر مقاس وجودة للسوشيال. تقدر تصدر مقاسات ثانية لاحقاً.")}</p></div></div>
        <div className="creator-form-grid">
          <fieldset className="creator-field"><legend>{copy(arabic, "Video format", "مقاس الفيديو")}</legend><div className="creator-choice-grid creator-ratio-grid">{RATIOS.map((ratio) => <button key={ratio} type="button" className={`creator-choice ${project.aspectRatio === ratio ? "is-selected" : ""}`} aria-pressed={project.aspectRatio === ratio} onClick={() => apply("aspectRatio", { aspectRatio: ratio })}>{ratio}</button>)}</div></fieldset>
          <div className="creator-field"><label htmlFor="campaign-resolution">{copy(arabic, "Quality", "الجودة")}</label><select id="campaign-resolution" className="creator-select" value={project.resolution} onChange={(event) => apply("resolution", { resolution: event.target.value as CreatorResolution })}><option value="720p">720p · {copy(arabic, "Recommended", "موصى به")}</option><option value="480p">480p · {copy(arabic, "Faster preview", "معاينة أسرع")}</option></select></div>
        </div>
        <div className="creator-campaign-toggles"><label className="creator-check-row"><input type="checkbox" checked={project.subtitles} onChange={(event) => apply("subtitles", { subtitles: event.target.checked })} /><span>{copy(arabic, "Include subtitles when the video contains speech.", "أضف ترجمة مكتوبة إذا كان الفيديو يحتوي على كلام.")}</span></label><label className="creator-check-row"><input type="checkbox" checked={project.audio} onChange={(event) => apply("audio", { audio: event.target.checked })} /><span>{copy(arabic, "Include music and sound for this version.", "أضف موسيقى وصوت لهذه النسخة.")}</span></label></div>
      </section>

      <div className="creator-campaign-pricing" role="status" aria-live="polite">
        {effectiveQuoteState === "loading" ? copy(arabic, "Confirming the current price…", "جارٍ تأكيد السعر الحالي…") : effectiveQuoteState === "ready" ? copy(arabic, "The current price is ready to review.", "السعر الحالي جاهز للمراجعة.") : effectiveQuoteState === "expired" ? copy(arabic, "The price expired. Confirm it again before generating.", "انتهت صلاحية السعر. أعد تأكيده قبل التوليد.") : copy(arabic, "We couldn’t confirm the current price. Your edits are saved; try again.", "تعذر تأكيد السعر الحالي. تقدر تحفظ تعديلاتك وتعيد المحاولة.")}
      </div>
      <div className="creator-campaign-actions">
        <button className="creator-button creator-button-primary" type="button" onClick={continueToReview}>{copy(arabic, "Continue to review", "المتابعة للمراجعة")}</button>
      </div>
    </div>
  );
}
