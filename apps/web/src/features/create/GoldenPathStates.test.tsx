import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FactReviewStep } from "./FactReviewStep";
import { SourceChoiceStep } from "./SourceChoiceStep";

describe("golden path source recovery states", () => {
  it("keeps the complete Arabic link draft visible and offers a single retry after a scan failure", () => {
    const retry = vi.fn();
    render(
      <SourceChoiceStep
        value="business_link"
        subject="service"
        url="https://noura.example.test/book"
        error="لم نتمكن من قراءة هذا الرابط. حملتك محفوظة."
        arabic
        onChoiceChange={vi.fn()}
        onSubjectChange={vi.fn()}
        onUrlChange={vi.fn()}
        onImport={vi.fn()}
        onCancel={vi.fn()}
        onFiles={vi.fn()}
        onManualStart={vi.fn()}
        onRetry={retry}
      />,
    );

    expect(screen.getByRole("heading", { name: "شنو تبي تروّج له؟" })).toBeVisible();
    expect(screen.getByDisplayValue("https://noura.example.test/book")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "حاول رابطاً آخر" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("announces an adjacent required booking error, focuses it, and keeps all entered service values", () => {
    render(
      <FactReviewStep
        source={{
          kind: "service_manual",
          subject: "service",
          assetKeys: [],
          facts: [
            { field: "service_name", value: "Noura Salon", provenance: "manual" },
            { field: "whatsapp", value: "+96550000000", provenance: "manual" },
          ],
        }}
        goal="bookings"
        onEdit={vi.fn()}
        onConfirm={vi.fn()}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    const booking = screen.getByLabelText("Booking link");
    expect(booking).toHaveFocus();
    expect(booking).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Add booking link to continue.");
    expect(screen.getByLabelText("Business or service name")).toHaveValue("Noura Salon");
    expect(screen.getByLabelText("WhatsApp number")).toHaveValue("+96550000000");
  });
});
