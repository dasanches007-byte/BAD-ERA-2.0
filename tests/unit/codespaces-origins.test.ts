import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GitHub Codespaces origin allowance (next.config.ts).
 *
 * Inside a Codespace the browser's Origin is `<name>-3000.app.github.dev` while
 * Next sees `x-forwarded-host: localhost:3000`. Without an allowance, Next's
 * Server Actions CSRF check aborts every action — reproduced as an HTTP 500 on
 * sign-in — and the dev server refuses its own live-reload connection.
 *
 * The allowance must be EXACTLY this Codespace, and nothing at all outside one.
 * These tests exist to stop a well-meaning "simplification" to a wildcard like
 * `*.app.github.dev`, which would let any Codespace on GitHub post Server
 * Actions to this one, or to an unconditional list that loosens production.
 */

type Config = {
  allowedDevOrigins?: string[];
  experimental?: { serverActions?: { allowedOrigins?: string[] } };
};

const ENV_KEYS = ["CODESPACE_NAME", "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"];
const saved: Record<string, string | undefined> = {};

async function loadConfig(): Promise<Config> {
  vi.resetModules();
  // Evaluated at import time, exactly as Next evaluates it at server start.
  return (await import("../../next.config")).default as Config;
}

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("outside a Codespace", () => {
  it("allows no extra origins — production keeps same-origin-only", async () => {
    for (const key of ENV_KEYS) delete process.env[key];
    const config = await loadConfig();

    expect(config.allowedDevOrigins).toEqual([]);
    expect(config.experimental?.serverActions?.allowedOrigins).toEqual([]);
  });

  it("allows nothing when only one of the two variables is present", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    delete process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
    const config = await loadConfig();

    expect(config.experimental?.serverActions?.allowedOrigins).toEqual([]);
  });
});

describe("inside a Codespace", () => {
  beforeEach(() => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "app.github.dev";
  });

  it("allows exactly this Codespace's forwarded address", async () => {
    const config = await loadConfig();

    expect(config.experimental?.serverActions?.allowedOrigins).toEqual([
      "fuzzy-space-3000.app.github.dev",
    ]);
    expect(config.allowedDevOrigins).toEqual(["fuzzy-space-3000.app.github.dev"]);
  });

  it("never uses a wildcard", async () => {
    const config = await loadConfig();
    const all = [
      ...(config.allowedDevOrigins ?? []),
      ...(config.experimental?.serverActions?.allowedOrigins ?? []),
    ];

    for (const origin of all) {
      expect(origin, `wildcard origin ${origin}`).not.toContain("*");
    }
  });
});
