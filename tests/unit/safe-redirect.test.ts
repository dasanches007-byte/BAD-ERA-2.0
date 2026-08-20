import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps a normal relative path", () => {
    expect(safeRedirectPath("/account/orders")).toBe("/account/orders");
  });

  it("preserves query and hash", () => {
    expect(safeRedirectPath("/shop?sort=newest#grid")).toBe("/shop?sort=newest#grid");
  });

  it("falls back when absent", () => {
    expect(safeRedirectPath(null)).toBe("/account");
    expect(safeRedirectPath("")).toBe("/account");
    expect(safeRedirectPath(undefined)).toBe("/account");
  });

  it.each([
    "//evil.example.com",
    "https://evil.example.com",
    "http://evil.example.com/path",
    "\\\\evil.example.com",
    "/\\evil.example.com",
    "javascript:alert(1)",
    "mailto:someone@example.com",
    "account",
  ])("rejects %s", (hostile) => {
    expect(safeRedirectPath(hostile)).toBe("/account");
  });

  it("honours a custom fallback", () => {
    expect(safeRedirectPath("https://evil.example.com", "/")).toBe("/");
  });
});
