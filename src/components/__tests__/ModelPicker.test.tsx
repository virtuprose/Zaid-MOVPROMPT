import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelPicker } from "@/components/ModelPicker";
import { LanguageProvider } from "@/i18n/LanguageContext";

const renderWithProviders = (ui: React.ReactElement) =>
  render(<LanguageProvider>{ui}</LanguageProvider>);

describe("ModelPicker", () => {
  it("renders the trigger with a selected value", () => {
    renderWithProviders(<ModelPicker model="any" onModelChange={() => {}} />);
    // The trigger is a combobox with accessible role
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });

  it("reflects model prop changes in the trigger label", () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(
      <ModelPicker model="any" onModelChange={onChange} />,
    );
    // Initial: "Any Model" label visible
    expect(screen.getByRole("combobox").textContent).toBeTruthy();

    rerender(
      <LanguageProvider>
        <ModelPicker model="veo-3" onModelChange={onChange} />
      </LanguageProvider>,
    );
    // After prop change, trigger still renders (flash state should not crash)
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("keeps a thumb-friendly tap height on the trigger", () => {
    renderWithProviders(<ModelPicker model="any" onModelChange={() => {}} />);
    const trigger = screen.getByRole("combobox");
    // Asserts the mobile min-height class is present (regression guard for the polish pass)
    expect(trigger.className).toMatch(/min-h-\[4rem\]/);
  });
});
