import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FactReviewStep } from "./FactReviewStep";
import { SourceChoiceStep } from "./SourceChoiceStep";

describe("product link to confirmed facts", () => {
  it("keeps a product link visible while it is checked, then marks the reviewed import as confirmed", () => {
    const onImport = vi.fn();
    const sourceChoice = render(
      <SourceChoiceStep
        value="product_link"
        subject="product"
        url="https://shop.example.test/products/no-07"
        busy
        onChoiceChange={vi.fn()}
        onSubjectChange={vi.fn()}
        onUrlChange={vi.fn()}
        onImport={onImport}
        onCancel={vi.fn()}
        onFiles={vi.fn()}
        onManualStart={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "What are you promoting?" })).toBeVisible();
    expect(screen.getByDisplayValue("https://shop.example.test/products/no-07")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Checking the link");
    expect(screen.queryByText(/sample product/i)).not.toBeInTheDocument();
    sourceChoice.unmount();

    const onEdit = vi.fn();
    const onConfirm = vi.fn();
    render(
      <FactReviewStep
        source={{
          kind: "product_url",
          subject: "product",
          assetKeys: [],
          facts: [
            { field: "name", value: "Northfield No. 07", provenance: "imported" },
            { field: "description", value: "A fragrance", provenance: "imported" },
          ],
        }}
        goal="launch"
        onEdit={onEdit}
        onConfirm={onConfirm}
        onContinue={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "Northfield No. 08" } });
    expect(onEdit).toHaveBeenCalledWith("name", "Northfield No. 08");
    expect(screen.getAllByText("Imported")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Confirm details" }));
    expect(onConfirm).toHaveBeenCalledWith(["name", "description"]);
  });
});
