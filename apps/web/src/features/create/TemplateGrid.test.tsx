import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { TemplateGrid } from "./TemplateGrid";
import { CREATOR_TEMPLATES } from "./templates";

const languageState = vi.hoisted(() => ({ locale: "en" as "en" | "ar" }));
const featureState = vi.hoisted(() => ({ portableAuth: false }));
const catalogApi = vi.hoisted(() => ({ listTemplates: vi.fn(), getTemplate: vi.fn() }));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ locale: languageState.locale }),
}));

vi.mock("@/config/features", () => ({
  isFeatureEnabled: (feature: string) => feature === "portableAuth" ? featureState.portableAuth : false,
}));

vi.mock("@/lib/api/portableApiClient", () => ({ portableCreatorApi: catalogApi }));

describe("TemplateGrid", () => {
  afterEach(() => {
    featureState.portableAuth = false;
    catalogApi.listTemplates.mockReset();
    catalogApi.getTemplate.mockReset();
  });
  it("offers an explicit way to continue with the already-selected template", () => {
    languageState.locale = "en";
    const onSelect = vi.fn();
    const selectedId = CREATOR_TEMPLATES[0]!.id;
    const view = render(
      <MemoryRouter>
        <TemplateGrid selectedId={selectedId} onSelect={onSelect} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue with selected template" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(selectedId);
    view.unmount();
  });

  it("renders honest static directions instead of fake playable cards", () => {
    languageState.locale = "en";
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    expect(view.container.querySelectorAll("video")).toHaveLength(0);
    expect(screen.getAllByText("Template direction")).toHaveLength(1);
    expect(screen.getAllByText("Motion preview")).toHaveLength(4);
    expect(view.container.querySelectorAll(".creator-template-media[data-media-tone]")).toHaveLength(5);
    expect(view.container.querySelectorAll<HTMLImageElement>(".creator-template-media img")[0]?.style.objectPosition).toBeTruthy();
    const previewButtons = screen.getAllByRole("button", { name: /Play .* preview/ });
    expect(previewButtons.length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /View .* details/ }).length).toBeGreaterThan(0);
    fireEvent.click(previewButtons[0]!);
    expect(screen.getByRole("dialog").querySelector("video")).toHaveAttribute("controls");
    view.unmount();
  });

  it("puts every verified preview before the honest static directions", () => {
    languageState.locale = "en";
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    const ready = screen.getByRole("region", { name: "Ready previews" });
    const directions = screen.getByRole("region", { name: "More campaign directions" });
    expect(within(ready).getAllByRole("button", { name: /Play .* preview/ })).toHaveLength(4);
    expect(within(directions).getAllByRole("link", { name: /View .* details/ })).toHaveLength(1);
    expect(ready.compareDocumentPosition(directions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    view.unmount();
  });

  it("keeps an already-selected static direction first without presenting it as playable", () => {
    languageState.locale = "en";
    const selected = CREATOR_TEMPLATES.find((template) => !template.previewVideo)!;
    const view = render(
      <MemoryRouter>
        <TemplateGrid selectedId={selected.id} onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    const selectedGroup = screen.getByRole("region", { name: "Selected direction" });
    expect(within(selectedGroup).getByRole("button", { name: `Choose ${selected.name} template` })).toHaveAttribute("aria-pressed", "true");
    expect(within(selectedGroup).getByRole("link", { name: `View ${selected.name} details` })).toBeVisible();
    expect(screen.getByRole("region", { name: "Ready previews" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "More campaign directions" })).not.toBeInTheDocument();
    expect(view.container.querySelector(".creator-template-group")).toBe(selectedGroup);
    view.unmount();
  });

  it("localizes catalog proof groups in Arabic", () => {
    languageState.locale = "ar";
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: "معاينات جاهزة" })).toBeVisible();
    expect(screen.getByRole("region", { name: "اتجاهات حملات إضافية" })).toBeVisible();
    view.unmount();
  });

  it("keeps static directions free of player-shaped timing chrome", () => {
    languageState.locale = "en";
    const staticTemplate = CREATOR_TEMPLATES.find((template) => !template.previewVideo)!;
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    const directions = screen.getByRole("region", { name: "More campaign directions" });
    const staticCard = within(directions).getByRole("button", { name: `Choose ${staticTemplate.name} template` }).closest("article")!;
    expect(within(staticCard).queryByRole("button", { name: /Play .* preview/ })).not.toBeInTheDocument();
    expect(within(staticCard).getByRole("link", { name: `View ${staticTemplate.name} details` })).toBeVisible();
    expect(staticCard.querySelector(".creator-template-duration")).toBeNull();
    expect(staticCard.querySelector("video")).toBeNull();
    view.unmount();
  });

  it("makes local fallback previews nonselectable until the published catalog is available", async () => {
    languageState.locale = "en";
    featureState.portableAuth = true;
    catalogApi.listTemplates.mockRejectedValue(new Error("catalog offline"));
    const onSelect = vi.fn();
    const view = render(<MemoryRouter><TemplateGrid onSelect={onSelect} /></MemoryRouter>);

    await screen.findByText("Local template previews are available to view only while the published catalog reconnects.");
    const previewOnlyCard = screen.getByRole("button", { name: `${CREATOR_TEMPLATES[0]!.name} template preview only` });
    expect(previewOnlyCard).toBeDisabled();
    fireEvent.click(previewOnlyCard);
    expect(onSelect).not.toHaveBeenCalled();

    catalogApi.listTemplates.mockResolvedValue([]);
    fireEvent.click(screen.getByRole("button", { name: "Retry catalog" }));
    await waitFor(() => expect(screen.getByText("Local template previews are available to view only while the published catalog reconnects.")).toBeVisible());
    view.unmount();
  });
});
