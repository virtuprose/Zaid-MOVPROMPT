import { describe, expect, it } from "vitest";

import { ar } from "@/i18n/translations/ar";
import { en } from "@/i18n/translations/en";

describe("authentication handoff copy", () => {
  it("describes exact campaign recovery without advertising retired model tooling", () => {
    const copy = [en["auth.heroTitle"], en["auth.heroCinema"], en["auth.heroDesc"]].join(" ");
    expect(copy).toContain("campaign");
    expect(copy).toContain("restores");
    expect(copy).not.toMatch(/Kling|Veo|model toolbox/i);
  });

  it("ships an Arabic campaign-recovery message", () => {
    expect(ar["auth.heroDesc"]).toMatch(/[\u0600-\u06ff]/u);
    expect(ar["auth.continueTitle"]).toMatch(/[\u0600-\u06ff]/u);
    expect(ar["auth.gateTitle"]).toMatch(/[\u0600-\u06ff]/u);
    expect(ar["auth.gateDescription"]).toMatch(/[\u0600-\u06ff]/u);
    expect(ar["auth.continueEmail"]).toMatch(/[\u0600-\u06ff]/u);
  });

  it("keeps the guest gate truthful about draft recovery and pricing", () => {
    expect(en["auth.gateDescription"]).toContain("this browser");
    expect(en["auth.gatePriceNote"]).toContain("No charge");
    expect(en["auth.gatePriceNote"]).toContain("final price");
  });

  it("explains that private-beta verification can be completed later", () => {
    expect(en["auth.verificationLaterNotice"]).toContain("Account settings");
    expect(en["auth.accountReadyDesc"]).toContain("campaign");
    expect(ar["auth.verificationLaterNotice"]).toMatch(/[\u0600-\u06ff]/u);
    expect(ar["auth.accountReadyDesc"]).toMatch(/[\u0600-\u06ff]/u);
  });
});
