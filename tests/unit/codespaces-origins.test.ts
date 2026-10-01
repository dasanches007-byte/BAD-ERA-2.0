import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GitHub Codespaces origin allowance (next.config.ts).
 *
 * Inside a Codespace the browser's Origin is `<name>-3000.app.github.dev` while
 * Next sees `x-forwarded-host: localhost:3000`. Without an allowance, Next's
 * Server Actions CSRF check aborts every action — sign-in included — with
 * E80 "Invalid Server Actions request".
 *
 * The first version required BOTH variables from the process environment. A
 * simulated Codespace with both set passed; the owner's real Codespace still
 * failed with E80. These tests pin the resolution order that replaced it —
 * environment, then GitHub's environment-variables.json, then the standard
 * domain — and keep the two properties that must never regress: exactly this
 * Codespace's address, and nothing at all outside a Codespace.
 */

const CODESPACES_ENV_FILE = "/workspaces/.codespaces/shared/environment-variables.json";

// The Codespaces variables file, as GitHub would write it. null = no file.
const fsState = vi.hoisted(() => ({ file: null as string | null }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const readFileSync = ((path: unknown, ...rest: unknown[]) => {
    if (path === CODESPACES_ENV_FILE) {
      if (fsState.file === null) {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }
      return fsState.file;
    }
    return (actual.readFileSync as (...args: unknown[]) => unknown)(path, ...rest);
  }) as typeof actual.readFileSync;
  return { ...actual, default: { ...actual, readFileSync }, readFileSync };
});

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

function allowed(config: Config): string[] | undefined {
  return config.experimental?.serverActions?.allowedOrigins;
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  fsState.file = null;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("outside a Codespace", () => {
  it("allows no extra origins — production keeps same-origin-only", async () => {
    const config = await loadConfig();
    expect(allowed(config)).toEqual([]);
    expect(config.allowedDevOrigins).toEqual([]);
  });

  it("allows nothing from a domain alone, with no Codespace name", async () => {
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "app.github.dev";
    expect(allowed(await loadConfig())).toEqual([]);
  });
});

describe("inside a Codespace", () => {
  it("uses both variables from the environment when present", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "app.github.dev";
    const config = await loadConfig();

    expect(allowed(config)).toEqual(["fuzzy-space-3000.app.github.dev"]);
    expect(config.allowedDevOrigins).toEqual(["fuzzy-space-3000.app.github.dev"]);
  });

  /**
   * The case that broke sign-in for real: the name reached `next dev` but the
   * forwarding domain did not. The old code required both and allowed nothing.
   */
  it("still allows this Codespace when only the name reached the environment", async () => {
    process.env.CODESPACE_NAME = "ominous-train-5vgpv44qpjrgf74pv";
    expect(allowed(await loadConfig())).toEqual([
      "ominous-train-5vgpv44qpjrgf74pv-3000.app.github.dev",
    ]);
  });

  it("falls back to GitHub's variables file when the environment has neither", async () => {
    fsState.file = JSON.stringify({
      CODESPACE_NAME: "ominous-train-5vgpv44qpjrgf74pv",
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
    });
    expect(allowed(await loadConfig())).toEqual([
      "ominous-train-5vgpv44qpjrgf74pv-3000.app.github.dev",
    ]);
  });

  it("takes the domain from the file when only the name is in the environment", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    fsState.file = JSON.stringify({ GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "example.dev" });
    expect(allowed(await loadConfig())).toEqual(["fuzzy-space-3000.example.dev"]);
  });

  it("prefers the environment over the file", async () => {
    process.env.CODESPACE_NAME = "from-env";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "app.github.dev";
    fsState.file = JSON.stringify({ CODESPACE_NAME: "from-file" });
    expect(allowed(await loadConfig())).toEqual(["from-env-3000.app.github.dev"]);
  });

  it("ignores a corrupt variables file instead of crashing the server", async () => {
    fsState.file = "{not json";
    expect(allowed(await loadConfig())).toEqual([]);
  });
});

describe("never a wildcard", () => {
  it.each(["*", "**", "a*b", "evil.example", "x/y", "name space"])(
    "refuses a malformed Codespace name: %j",
    async (name) => {
      process.env.CODESPACE_NAME = name;
      expect(allowed(await loadConfig())).toEqual([]);
    },
  );

  it("refuses a malformed domain", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "*.github.dev";
    expect(allowed(await loadConfig())).toEqual([]);
  });

  it("never emits a `*` in any resolved origin", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    const config = await loadConfig();
    for (const origin of [...(config.allowedDevOrigins ?? []), ...(allowed(config) ?? [])]) {
      expect(origin).not.toContain("*");
    }
  });
});
