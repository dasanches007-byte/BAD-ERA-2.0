/**
 * Test stub for the `server-only` package.
 *
 * The real module throws on import outside a React Server Component, which is
 * exactly the build-time guard we want in the app and exactly what makes a
 * server module untestable in Vitest.
 *
 * Aliasing it away here does NOT weaken the guard: `next build` still resolves
 * the real package, so a Client Component importing a server module is still a
 * build failure. This only lets the unit tests reach pure functions that happen
 * to live in a server-only file.
 */
export {};
