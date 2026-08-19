import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthGateDialog } from "./AuthGateDialog";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderGate(locale: "en" | "ar" = "en") {
  localStorage.setItem("movprompt-lang", locale);
  return render(
    <MemoryRouter initialEntries={["/create"]}>
      <LanguageProvider>
        <AuthGateDialog open onOpenChange={() => undefined} returnPath="/create?draft=draft-1&resume=generate" />
        <LocationProbe />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

describe("AuthGateDialog provider truth", () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem("movprompt-lang");
  });

  it("shows email as the primary local path and no dead social controls", () => {
    renderGate();

    const email = screen.getByRole("button", { name: "Continue with email" });
    expect(email).toHaveClass("creator-button-primary");
    expect(screen.queryByRole("button", { name: /Google|Apple/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^or$/i)).not.toBeInTheDocument();

    fireEvent.click(email);
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/auth?next=%2Fcreate%3Fdraft%3Ddraft-1%26resume%3Dgenerate",
    );
  });

  it("localizes the entire handoff in Arabic", () => {
    renderGate("ar");

    expect(screen.getByRole("heading", { name: "حملتك جاهزة للإنشاء" })).toBeVisible();
    expect(screen.getByRole("button", { name: "المتابعة بالبريد الإلكتروني" })).toBeVisible();
    expect(screen.getByText(/لن يتم الخصم قبل تأكيد السعر النهائي/)).toBeVisible();
    expect(screen.queryByText(/Your campaign|Continue with email|No charge/)).not.toBeInTheDocument();
  });
});
