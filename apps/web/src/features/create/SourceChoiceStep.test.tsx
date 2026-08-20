import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { SourceChoiceStep } from "./SourceChoiceStep";

function renderSourceChoice(overrides: Partial<ComponentProps<typeof SourceChoiceStep>> = {}) {
  const onChoiceChange = vi.fn();
  const onSubjectChange = vi.fn();
  render(
    <SourceChoiceStep
      value="product_link"
      subject="product"
      url=""
      onChoiceChange={onChoiceChange}
      onSubjectChange={onSubjectChange}
      onUrlChange={vi.fn()}
      onImport={vi.fn()}
      onCancel={vi.fn()}
      onFiles={vi.fn()}
      onManualStart={vi.fn()}
      {...overrides}
    />,
  );
  return { onChoiceChange, onSubjectChange };
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
});
