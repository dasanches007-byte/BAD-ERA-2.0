import {
  EMAIL_COLORS as C,
  button,
  emailDocument,
  escapeHtml,
  eyebrow,
  heading,
  paragraph,
  plainText,
  row,
  type RenderedEmail,
} from "@/lib/email/layout";

/**
 * The emails that open and recover a customer account. PURE.
 *
 * Each carries one link, made by the server from a one-time token Supabase
 * issued for this address; the link opens a page on the site where the
 * customer presses a button to use it (so a mail scanner that "visits" links
 * cannot spend the token). Nothing here states a fact about the customer's
 * account to anyone but the inbox it was sent to.
 */

function footer(site: string): string {
  return `If you didn't ask for this, you can ignore this email. Nothing changes until the link is used. <a href="${escapeHtml(site)}/support" style="color:${C.bone};">Contact us</a>`;
}

function render({
  site,
  subject,
  tag,
  title,
  lines,
  action,
}: {
  site: string;
  subject: string;
  tag: string;
  title: string;
  lines: string[];
  action: { label: string; href: string };
}): RenderedEmail {
  const html = emailDocument({
    site,
    title: subject,
    preheader: lines[0] ?? subject,
    rows:
      row(`${eyebrow(tag)}${heading(title)}${lines.map(paragraph).join("")}${button(action.label, action.href)}`) +
      row(
        `<div style="font:400 12px/1.6 Helvetica, Arial, sans-serif;color:${C.steel};word-break:break-all;">Or open this link: <a href="${escapeHtml(action.href)}" style="color:${C.steel};">${escapeHtml(action.href)}</a></div>`,
        20,
      ),
    footer: footer(site),
  });
  const text = plainText([
    title,
    "",
    ...lines,
    "",
    `${action.label}: ${action.href}`,
    "",
    "If you didn't ask for this, you can ignore this email.",
  ]);
  return { subject, html, text };
}

/** Sign-up: confirm the address to open the account. */
export function confirmEmailMessage(site: string, link: string): RenderedEmail {
  return render({
    site,
    subject: "Confirm your email",
    tag: "Your account",
    title: "Confirm your email",
    lines: [
      "Confirm this address to finish creating your account. Then you can sign in, see your orders and keep your addresses.",
    ],
    action: { label: "Confirm email", href: link },
  });
}

/** Forgotten password: choose a new one. */
export function resetPasswordMessage(site: string, link: string): RenderedEmail {
  return render({
    site,
    subject: "Reset your password",
    tag: "Your account",
    title: "Choose a new password",
    lines: ["Use the button below to choose a new password for your account. The link works once."],
    action: { label: "Choose a new password", href: link },
  });
}

/**
 * Someone tried to sign up with an address that already has an account. Sent
 * to that address, so the page that took the sign-up can say the same thing
 * whether or not the account existed (no one learns who has an account).
 */
export function alreadyRegisteredMessage(site: string): RenderedEmail {
  return render({
    site,
    subject: "You already have an account",
    tag: "Your account",
    title: "You already have an account",
    lines: [
      "Someone, probably you, tried to create an account with this email, but there is one already. Sign in instead, or choose a new password if you have forgotten it.",
    ],
    action: { label: "Sign in", href: `${site}/sign-in?next=/account` },
  });
}
