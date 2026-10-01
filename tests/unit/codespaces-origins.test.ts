import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GitHub Codespaces origin allowance (next.config.ts).
 *
 * Behind the Codespaces port-forwarding proxy, Next's Server Actions CSRF check
 * sees an Origin that does not match `x-forwarded-host`, and aborts every
 * action — sign-in included — with E80 "Invalid Server Actions request".
 *
 * It took three attempts. The first two allowed the Codespace's own address as
 * an Origin, which is what a simulated proxy sent. A real Codespace rewrites
 * Origin to `localhost:3000` and forwards the Codespace address as
 * `x-forwarded-host`, so the owner's sign-in kept failing on a fresh Codespace.
 * These tests pin the allowance that matches the real proxy, and the
 * properties that must never regress: nothing at all outside a Codespace, and
 * never a wildcard.
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

const ENV_KEYS = ["CODESPACES", "CODESPACE_NAME", "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"];
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

  it("never accepts a localhost Origin in production or a local build", async () => {
    process.env.CODESPACES = "false";
    fsState.file = JSON.stringify({ CODESPACES: "false" });
    expect(allowed(await loadConfig())).not.toContain("localhost:3000");
  });
});

describe("inside a Codespace", () => {
  /**
   * The case that broke sign-in for real, on two fresh Codespaces: Next logged
   * "`x-forwarded-host` header with value `<name>-3000.app.github.dev` does
   * not match `origin` header with value `localhost:3000`".
   */
  it("accepts the localhost Origin the Codespaces proxy substitutes", async () => {
    process.env.CODESPACES = "true";
    process.env.CODESPACE_NAME = "solid-space-abc123";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "app.github.dev";
    expect(allowed(await loadConfig())).toContain("localhost:3000");
  });

  it("does not need the Codespace name to accept the proxy's Origin", async () => {
    process.env.CODESPACES = "true";
    const config = await loadConfig();
    expect(allowed(config)).toEqual(["localhost:3000"]);
    // Nothing to list for dev resources without an address; localhost is
    // always allowed by Next itself.
    expect(config.allowedDevOrigins).toEqual([]);
  });

  it("recognises a Codespace from GitHub's variables file alone", async () => {
    fsState.file = JSON.stringify({ CODESPACES: "true" });
    expect(allowed(await loadConfig())).toEqual(["localhost:3000"]);
  });

  it("also keeps this Codespace's own address, for a proxy that passes Origin through", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "app.github.dev";
    const config = await loadConfig();

    expect(allowed(config)).toEqual(["fuzzy-space-3000.app.github.dev", "localhost:3000"]);
    expect(config.allowedDevOrigins).toEqual(["fuzzy-space-3000.app.github.dev"]);
  });

  it("defaults the domain when only the name reached the environment", async () => {
    process.env.CODESPACE_NAME = "ominous-train-5vgpv44qpjrgf74pv";
    expect(allowed(await loadConfig())).toEqual([
      "ominous-train-5vgpv44qpjrgf74pv-3000.app.github.dev",
      "localhost:3000",
    ]);
  });

  it("falls back to GitHub's variables file when the environment has neither", async () => {
    fsState.file = JSON.stringify({
      CODESPACE_NAME: "ominous-train-5vgpv44qpjrgf74pv",
      GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "app.github.dev",
    });
    expect(allowed(await loadConfig())).toEqual([
      "ominous-train-5vgpv44qpjrgf74pv-3000.app.github.dev",
      "localhost:3000",
    ]);
  });

  it("takes the domain from the file when only the name is in the environment", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    fsState.file = JSON.stringify({ GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: "example.dev" });
    expect(allowed(await loadConfig())).toEqual(["fuzzy-space-3000.example.dev", "localhost:3000"]);
  });

  it("prefers the environment over the file", async () => {
    process.env.CODESPACE_NAME = "from-env";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "app.github.dev";
    fsState.file = JSON.stringify({ CODESPACE_NAME: "from-file" });
    expect(allowed(await loadConfig())).toEqual(["from-env-3000.app.github.dev", "localhost:3000"]);
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
      process.env.CODESPACES = "true";
      process.env.CODESPACE_NAME = name;
      // Not what a Codespace looks like: allow nothing rather than guess.
      expect(allowed(await loadConfig())).toEqual([]);
    },
  );

  it("refuses a malformed domain", async () => {
    process.env.CODESPACE_NAME = "fuzzy-space";
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = "*.github.dev";
    expect(allowed(await loadConfig())).toEqual([]);
  });

  it("never emits a `*` in any resolved origin", async () => {
    process.env.CODESPACES = "true";
    process.env.CODESPACE_NAME = "fuzzy-space";
    const config = await loadConfig();
    for (const origin of [...(config.allowedDevOrigins ?? []), ...(allowed(config) ?? [])]) {
      expect(origin).not.toContain("*");
    }
  });
});
