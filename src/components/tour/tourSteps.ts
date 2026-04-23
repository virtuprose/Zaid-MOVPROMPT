export interface TourStep {
  id: string;
  anchor: string; // data-tour attribute value
  titleKey: string;
  bodyKey: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export const TOUR_STEPS: TourStep[] = [
  { id: "model", anchor: "model-picker", titleKey: "tour.step1.title", bodyKey: "tour.step1.body", placement: "bottom" },
  { id: "upload", anchor: "image-upload", titleKey: "tour.step2.title", bodyKey: "tour.step2.body", placement: "bottom" },
  { id: "describe", anchor: "describe-textarea", titleKey: "tour.step3.title", bodyKey: "tour.step3.body", placement: "top" },
  { id: "analyze", anchor: "analyze-button", titleKey: "tour.step4.title", bodyKey: "tour.step4.body", placement: "top" },
  { id: "generate", anchor: "generate-button", titleKey: "tour.step5.title", bodyKey: "tour.step5.body", placement: "top" },
  { id: "library", anchor: "library-link", titleKey: "tour.step6.title", bodyKey: "tour.step6.body", placement: "bottom" },
];

export const TOUR_DONE_KEY_PREFIX = "movprompt.tour.v1.done";
export const WELCOME_DISMISSED_FLAG = "movprompt.welcomeDismissed";
