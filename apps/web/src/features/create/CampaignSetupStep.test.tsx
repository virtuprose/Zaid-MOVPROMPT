import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CampaignSetupStep } from "./CampaignSetupStep";
import { createDraftProject } from "./templates";

describe("CampaignSetupStep", () => {
  it("completes the no presenter Kuwait setup and asks for a fresh price after a relevant edit", () => {
    const project = createDraftProject("luxury-product-reveal");
    project.product = {
      ...project.product,
      name: "Noura perfume",
      price: "12.500",
    };
    project.offer = "A gift with every order";
    project.cta = "Order on WhatsApp";
    project.whatsapp = "+96550000000";
    const onChange = vi.fn();
    const onContinue = vi.fn();

    render(
      <CampaignSetupStep
        project={project}
        quoteState="ready"
        onChange={onChange}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByRole("heading", { name: "Set up your campaign" })).toBeVisible();
    expect(screen.getByText("No presenter")).toBeVisible();
    expect(screen.getByLabelText("Market")).toHaveValue("KW");
    expect(screen.getByLabelText("Price")).toHaveValue("12.500");
    expect(screen.getByLabelText("WhatsApp number")).toHaveValue("+96550000000");

    fireEvent.change(screen.getByLabelText("Call to action"), { target: { value: "Shop now" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cta: "Shop now" }));
    expect(screen.getByText("Confirming the current price…")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Continue to review" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("keeps Arabic, bilingual and hidden delivery values intact while validating the chosen outcome", () => {
    const project = createDraftProject("salon-booking-offer");
    project.promotionKind = "business";
    project.language = "bilingual";
    project.goal = "bookings";
    project.bookingUrl = "https://noura.example/book";
    project.whatsapp = "+96550000000";
    project.product = { ...project.product, name: "Noura Salon", price: "9.000" };
    const onChange = vi.fn();

    render(<CampaignSetupStep project={project} quoteState="ready" onChange={onChange} onContinue={vi.fn()} arabic />);

    expect(screen.getByLabelText("لغة الحملة")).toHaveValue("bilingual");
    expect(screen.getByLabelText("رابط الحجز")).toHaveValue("https://noura.example/book");
    expect(screen.getByLabelText("رقم واتساب")).toHaveValue("+96550000000");
    expect(screen.getByLabelText("السعر")).toHaveValue("9.000");
  });
});
