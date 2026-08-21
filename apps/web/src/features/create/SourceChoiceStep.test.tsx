import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { SourceChoiceStep } from "./SourceChoiceStep";

function renderSourceChoice(overrides: Partial<ComponentProps<typeof SourceChoiceStep>> = {}) {
  const onChoiceChange = vi.fn();
  const onSubjectChange = vi.fn();
  const onFiles = vi.fn();
  const onManualStart = vi.fn();
  const view = render(
    <SourceChoiceStep
      value="product_link"
      subject="product"
      url=""
      onChoiceChange={onChoiceChange}
      onSubjectChange={onSubjectChange}
      onUrlChange={vi.fn()}
      onImport={vi.fn()}
      onCancel={vi.fn()}
      onFiles={onFiles}
      onManualStart={onManualStart}
      {...overrides}
    />,
  );
  return { onChoiceChange, onSubjectChange, onFiles, onManualStart, view };
}

describe("SourceChoiceStep", () => {
  it("uses roving tabindex and arrow keys for source radios", () => {
    const { onChoiceChange } = renderSourceChoice();
    const productLink = screen.getByRole("radio", { name: /Product link/i });
    const businessLink = screen.getByRole("radio", { name: /Business or service link/i });

    expect(productLink).toHaveAttribute("tabindex", "0");
    expect(businessLink).toHaveAttribute("tabindex", "-1");
    productLink.focus();
    fireEvent.keyDown(productLink, { key: "ArrowRight" });

    expect(onChoiceChange).toHaveBeenCalledWith("business_link");
    expect(businessLink).toHaveFocus();
  });

  it("uses roving tabindex and Home/End keys for product or service radios", () => {
    const { onSubjectChange } = renderSourceChoice({ value: "upload", subject: "product" });
    const product = screen.getByRole("radio", { name: "A product" });
    const service = screen.getByRole("radio", { name: "A business or service" });

    product.focus();
    fireEvent.keyDown(product, { key: "End" });
    expect(onSubjectChange).toHaveBeenCalledWith("service");
    expect(service).toHaveFocus();
  });

  it("offers product and business links plus photos, real footage, and manual facts as distinct truthful starts", () => {
    const upload = renderSourceChoice({ value: "upload", subject: "service" });

    expect(screen.getByRole("radio", { name: /Product link/i })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Business or service link/i })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Upload photos or footage/i })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Enter details manually/i })).toBeVisible();

    const input = screen.getByLabelText(/Choose photos or footage/i);
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,video/mp4,video/quicktime");
    fireEvent.change(input, { target: { files: [new File(["footage"], "spokesperson.mov", { type: "video/quicktime" })] } });
    expect(upload.onFiles).toHaveBeenCalledTimes(1);

    upload.onChoiceChange.mockClear();
    fireEvent.click(screen.getByRole("radio", { name: /Enter details manually/i }));
    expect(upload.onChoiceChange).toHaveBeenCalledWith("manual");

    upload.view.unmount();
    const manual = renderSourceChoice({ value: "manual", subject: "service" });
    fireEvent.click(screen.getByRole("button", { name: "Enter details" }));
    expect(manual.onManualStart).toHaveBeenCalledTimes(1);
  });
});
