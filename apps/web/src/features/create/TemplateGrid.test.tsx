import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CATEGORY_PREVIEW_TEMPLATE_IDS } from "@movprompt/creative-engine";

import { TemplateGrid } from "./TemplateGrid";
import { CREATOR_TEMPLATES, DISCOVERABLE_CREATOR_TEMPLATES, PREVIEWED_CREATOR_TEMPLATES } from "./templates";

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
  const originalPreviews = CREATOR_TEMPLATES.map(t => t.previewVideo);
  afterEach(() => {
    CREATOR_TEMPLATES.forEach((t, i) => { t.previewVideo = originalPreviews[i]!; });
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

  it("renders verified motion previews plus the approved advertising direction", () => {
    languageState.locale = "en";
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    expect(view.container.querySelectorAll("video")).toHaveLength(0);
    expect(screen.getAllByText("Video preview coming later")).toHaveLength(1);
    expect(screen.getAllByText("Motion preview")).toHaveLength(CATEGORY_PREVIEW_TEMPLATE_IDS.length);
    expect(view.container.querySelectorAll(".creator-template-media[data-media-tone]")).toHaveLength(DISCOVERABLE_CREATOR_TEMPLATES.length);
    expect(view.container.querySelectorAll<HTMLImageElement>(".creator-template-media img")[0]?.style.objectPosition).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Play .* preview/ })).toHaveLength(CATEGORY_PREVIEW_TEMPLATE_IDS.length);
    expect(screen.getAllByRole("link", { name: /View .* details/ })).toHaveLength(1);
    view.unmount();
  });

  it("renders one usable template in each approved discovery category", () => {
    languageState.locale = "en";
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    for (const name of ["Electronics", "Food", "Ecommerce", "Advertising"]) {
      expect(within(screen.getByRole("region", { name })).getAllByRole("button", { name: /Choose .* template/ })).toHaveLength(1);
    }
    expect(screen.queryByRole("region", { name: "Beauty / Cosmetics" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Real Estate / Business Services" })).not.toBeInTheDocument();
    view.unmount();
  });

  it("keeps an already-selected direction selected inside its category", () => {
    languageState.locale = "en";
    const selected = PREVIEWED_CREATOR_TEMPLATES[1]!;
    const view = render(
      <MemoryRouter>
        <TemplateGrid selectedId={selected.id} onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    const selectedGroup = screen.getByRole("region", { name: "Food" });
    expect(within(selectedGroup).getByRole("button", { name: `Choose ${selected.name} template` })).toHaveAttribute("aria-pressed", "true");
    expect(within(selectedGroup).getByRole("button", { name: `Play ${selected.name} preview` })).toBeVisible();
    view.unmount();
  });

  it("localizes catalog proof groups in Arabic", () => {
    languageState.locale = "ar";
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("region", { name: "الإلكترونيات" })).toBeVisible();
    expect(screen.getByRole("region", { name: "الأطعمة" })).toBeVisible();
    expect(screen.getByRole("region", { name: "الإعلانات" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "العقار وخدمات الأعمال" })).not.toBeInTheDocument();
    view.unmount();
  });

  it("shows only the explicitly approved poster-only advertising direction", () => {
    languageState.locale = "en";
    const advertising = CREATOR_TEMPLATES.find((template) => template.id === "new-york-billboard-takeover")!;
    const hiddenPosterOnlyTemplate = CREATOR_TEMPLATES.find((template) => !template.previewVideo && template.id !== advertising.id)!;
    const onSelect = vi.fn();
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={onSelect} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Advertising", pressed: false }));
    const chooseAdvertising = screen.getByRole("button", { name: `Choose ${advertising.name} template` });
    expect(chooseAdvertising).toBeEnabled();
    fireEvent.click(chooseAdvertising);
    expect(onSelect).toHaveBeenCalledWith(advertising.id);
    expect(screen.queryByRole("button", { name: `Choose ${hiddenPosterOnlyTemplate.name} template` })).not.toBeInTheDocument();
    view.unmount();
  });

  it("filters one template into each discovery category", () => {
    languageState.locale = "en";
    const view = render(
      <MemoryRouter>
        <TemplateGrid onSelect={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("button", { name: /Choose .* template/ })).toHaveLength(DISCOVERABLE_CREATOR_TEMPLATES.length);
    for (const category of ["Electronics", "Food", "Ecommerce", "Advertising"]) {
      fireEvent.click(screen.getByRole("button", { name: category, pressed: false }));
      expect(screen.getAllByRole("button", { name: /Choose .* template/ })).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: "All", pressed: false }));
    }
    const advertising = screen.getByRole("button", { name: "Advertising", pressed: false });
    expect(advertising).toBeEnabled();
    expect(screen.getAllByRole("button", { name: /Choose .* template/ })).toHaveLength(DISCOVERABLE_CREATOR_TEMPLATES.length);
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
