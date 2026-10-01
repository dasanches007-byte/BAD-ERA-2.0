#!/usr/bin/env node
/**
 * Set a new password for the BAD ERA Studio owner.
 *
 *   npm run owner:password
 *
 * Run it inside the Codespace (or anywhere both keys are set as environment
 * variables). It asks for the new password twice, with typing hidden.
 *
 * WHY THIS EXISTS RATHER THAN "SEND PASSWORD RECOVERY"
 *
 * Supabase's recovery email links to the project's Site URL, which defaults to
 * http://localhost:3000 — a dead address on a phone — and redirect targets must
 * be allow-listed per environment. Widening that allow-list to every Codespace
 * address would let a stranger's Codespace receive a recovery code. This avoids
 * the whole email round-trip: whoever holds the service-role key already has
 * full control of the project, so using it to set the owner's password grants
 * nothing new.
 *
 * WHAT IT DELIBERATELY DOES
 *
 *   - goes through Supabase Auth's admin API, never a hand-written UPDATE on
 *     auth.users: Auth owns password hashing and its own bookkeeping
 *   - only offers accounts that are active Studio owners in `studio_users`, so
 *     it cannot be used casually against a customer account
 *   - never prints the password or the key; typed characters show as dots so a
 *     phone user can see their taps registered
 */

import { createClient } from "@supabase/supabase-js";

const MIN_LENGTH = 10;
// bcrypt, which Supabase Auth uses, only considers the first 72 bytes, and Auth
// rejects anything longer.
const MAX_BYTES = 72;
const MAX_ATTEMPTS = 3;

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const OFF = "\x1b[0m";

/** Returns an error message, or null when the password is acceptable. */
export function validatePassword(password, confirmation) {
  if (password.length === 0) return "The password can't be empty.";
  if (password !== password.trim()) {
    return "The password can't start or end with a space.";
  }
  if (password.length < MIN_LENGTH) {
    return `Use at least ${MIN_LENGTH} characters.`;
  }
  if (Buffer.byteLength(password, "utf8") > MAX_BYTES) {
    return `That's too long — keep it under ${MAX_BYTES} characters.`;
  }
  if (password !== confirmation) return "The two passwords didn't match.";
  return null;
}

// --- Input ------------------------------------------------------------------

/**
 * Reads answers from stdin.
 *
 * On a real terminal, hidden prompts switch to raw mode so nothing typed is
 * echoed. When input is piped (automation, tests) it falls back to reading one
 * line per prompt.
 */
function createPrompter() {
  const stdin = process.stdin;
  const interactive = Boolean(stdin.isTTY);
  let pipedLines = null;

  async function nextPipedLine() {
    if (pipedLines === null) {
      let data = "";
      for await (const chunk of stdin) data += chunk;
      pipedLines = data.split(/\r?\n/);
    }
    if (pipedLines.length === 0) throw new Error("No more input.");
    return pipedLines.shift();
  }

  function readRaw(question, { hidden }) {
    return new Promise((resolve, reject) => {
      process.stdout.write(question);
      stdin.setRawMode(true);
      stdin.setEncoding("utf8");
      stdin.resume();
      let value = "";

      const finish = (fn) => {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        fn();
      };

      function onData(chunk) {
        for (const ch of chunk) {
          if (ch === "\r" || ch === "\n") return finish(() => resolve(value));
          if (ch === "\u0003") {
            return finish(() => reject(new Error("Cancelled.")));
          }
          if (ch === "\u007f" || ch === "\b") {
            if (value.length > 0) {
              value = value.slice(0, -1);
              process.stdout.write("\b \b");
            }
            continue;
          }
          // Arrow keys and other escape sequences: ignore the whole chunk
          // rather than leaking "[A" into the password.
          if (ch === "\u001b") break;
          if (ch < " ") continue;
          value += ch;
          process.stdout.write(hidden ? "•" : ch);
        }
      }

      stdin.on("data", onData);
    });
  }

  return {
    async ask(question) {
      if (!interactive) {
        process.stdout.write(question);
        const line = await nextPipedLine();
        process.stdout.write("\n");
        return line;
      }
      return readRaw(question, { hidden: false });
    },
    async askHidden(question) {
      if (!interactive) {
        process.stdout.write(question);
        const line = await nextPipedLine();
        process.stdout.write("\n");
        return line;
      }
      return readRaw(question, { hidden: true });
    },
  };
}

// --- Main -------------------------------------------------------------------

function siteAddress() {
  const name = process.env.CODESPACE_NAME;
  if (name) {
    const domain =
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev";
    return `https://${name}-3000.${domain}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function fail(message) {
  console.error(`\n${RED}${BOLD}${message}${OFF}\n`);
  process.exit(1);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    fail(
      "This needs your Supabase keys, and they aren't set here.\n" +
        "Run it inside your Codespace, where they are added automatically.",
    );
  }

  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // Only active Studio owners are offered. Authorization comes from
  // studio_users, never from anything the user can edit about themselves.
  const { data: owners, error: ownerError } = await db
    .from("studio_users")
    .select("user_id")
    .eq("role", "owner")
    .eq("active", true);

  if (ownerError) {
    fail(`Couldn't read the Studio owner list: ${ownerError.message}`);
  }
  if (!owners || owners.length === 0) {
    fail("There is no active Studio owner account in this project.");
  }

  const accounts = [];
  for (const owner of owners) {
    const { data, error } = await db.auth.admin.getUserById(owner.user_id);
    if (error || !data?.user) continue;
    accounts.push({ id: data.user.id, email: data.user.email ?? "(no email)" });
  }

  if (accounts.length === 0) {
    fail("Couldn't load the owner account from Supabase Auth.");
  }

  const prompt = createPrompter();
  let account = accounts[0];

  if (accounts.length > 1) {
    console.log("\nStudio owner accounts:");
    accounts.forEach((a, i) => console.log(`  ${i + 1}. ${a.email}`));
    const choice = Number.parseInt(await prompt.ask("\nWhich one? Type the number: "), 10);
    account = accounts[choice - 1];
    if (!account) fail("That isn't one of the numbers listed.");
  }

  console.log(`\n${BOLD}Set a new password for ${account.email}${OFF}`);
  console.log(
    `${DIM}At least ${MIN_LENGTH} characters. Typing shows as dots — that's expected.${OFF}\n`,
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const password = await prompt.askHidden("New password:     ");
    const confirmation = await prompt.askHidden("Type it again:    ");

    const problem = validatePassword(password, confirmation);
    if (problem) {
      console.log(`${RED}${problem}${OFF}${attempt < MAX_ATTEMPTS ? " Try again.\n" : ""}`);
      continue;
    }

    const { error } = await db.auth.admin.updateUserById(account.id, { password });
    if (error) {
      // Auth's messages are safe to show ("Password is known to be weak", etc.)
      // and they never contain the password itself.
      console.log(`${RED}Supabase refused it: ${error.message}${OFF}`);
      if (attempt < MAX_ATTEMPTS) console.log("Try a different password.\n");
      continue;
    }

    console.log(`\n${GREEN}${BOLD}Done — your password has been changed.${OFF}\n`);
    console.log(`Sign in at   ${BOLD}${siteAddress()}/studio${OFF}`);
    console.log(`Email        ${account.email}\n`);
    console.log(`${DIM}Save it somewhere safe, like your phone's password manager.${OFF}\n`);
    process.exit(0);
  }

  fail("Password not changed. Run the command again when you're ready.");
}

// Only run when executed directly, so the validator can be imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    if (error?.message === "Cancelled.") {
      console.log("\nCancelled — nothing was changed.\n");
      process.exit(130);
    }
    fail(`Something went wrong: ${error?.message ?? error}`);
  });
}
