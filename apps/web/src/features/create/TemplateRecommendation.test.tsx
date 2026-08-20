import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TemplateRecommendations } from "./TemplateRecommendations.tsx";
import { CREATOR_TEMPLATES } from "./templates";

const props = {
  templates: CREATOR_TEMPLATES,
  goal: "launch" as const,
  vertical: "ecommerce" as const,
  language: "en" as const,
  aspectRatio: "9:16" as const,
  hasSource: true,
  configurationForTemplate: vi.fn(() => ({
    prompt: "confirmed source",
    durationSeconds: 8,
    aspectRatio: "9:16" as const,
    resolution: "720p" as const,
    audio: true,
    templateQuoteContext: { market: "KW", language: "en", goal: "launch", presenterMode: "none", bookingUrl: "", subtitles: true },
    creativeBrief: {} as never,
    references: [],
  })),
  quoteStateForTemplate: () => ({
    status: "ready" as const,
    key: "quoted-template",
    retryable: false,
    quote: { quoteId: "quote-1", credits: 42, expiresAt: "2099-01-01T00:00:00.000Z", entitlementEligible: false },
    retry: vi.fn(),
  } as never),
};

describe("TemplateRecommendations", () => {
  it("quoted recommendation tracer selects an exact ready template and quote", () => {
    const onSelect = vi.fn();
    expect(TemplateRecommendations).toBeTypeOf("function");
    render(<TemplateRecommendations {...props} onSelect={onSelect} />);

    const card = screen.getAllByRole("article")[0]!;
    expect(card).toHaveTextContent("Why this fits");
    expect(card).toHaveTextContent("Confirmed price");
    fireEvent.click(screen.getAllByRole("button", { name: "Use this template" })[0]!);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      template: expect.objectContaining({ goals: expect.arrayContaining(["launch"]) }),
      quote: expect.objectContaining({ quoteId: "quote-1" }),
    }));
  });
});
