import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeAuthReturnIntent,
  readAuthReturnIntent,
  rememberAuthReturnIntent,
  safeAuthReturnPath,
} from "./returnPath";

describe("portable auth return paths", () => {
  beforeEach(() => sessionStorage.clear());

  it("keeps same-origin paths with query and hash", () => {
    expect(safeAuthReturnPath("/create/draft-1?step=review#quote")).toBe(
      "/create/draft-1?step=review#quote",
    );
  });

  it("rejects external, protocol-relative, auth-loop and backslash paths", () => {
    expect(safeAuthReturnPath("https://evil.example/steal")).toBe("/create");
    expect(safeAuthReturnPath("//evil.example/steal")).toBe("/create");
    expect(safeAuthReturnPath("/\\evil.example/steal")).toBe("/create");
    expect(safeAuthReturnPath("/auth?next=/auth")).toBe("/create");
  });

  it("preserves and consumes guest draft return intent", () => {
    rememberAuthReturnIntent("/create/draft-1?generate=1");
    expect(readAuthReturnIntent()).toBe("/create/draft-1?generate=1");
    expect(consumeAuthReturnIntent()).toBe("/create/draft-1?generate=1");
    expect(readAuthReturnIntent()).toBe("/create");
  });
});
