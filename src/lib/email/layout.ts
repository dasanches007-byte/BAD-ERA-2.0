/**
 * The frame every BAD ERA email shares. PURE and client-safe.
 *
 * Near-black, bone and steel, no colour: the storefront's palette without the
 * cement (email clients will not render the texture reliably). The logo is
 * the approved artwork, loaded from the site as an image, never typeset;
 * "BAD ERA" appears only as its alt text, for clients that block images.
 */

export const EMAIL_COLORS = {
  page: "#0d0d0c",
  card: "#151514",
  bone: "#ece8e1",
  steel: "#9d9890",
  line: "#2c2b29",
} as const;

export const EMAIL_SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
export const EMAIL_POSTER = "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type RenderedEmail = { subject: string; html: string; text: string };

const C = EMAIL_COLORS;

/** The small uppercase line above a heading. */
export function eyebrow(text: string): string {
  return `<div style="font:700 11px/1.4 ${EMAIL_SANS};letter-spacing:0.14em;text-transform:uppercase;color:${C.steel};">${escapeHtml(text)}</div>`;
}

/** The heading, in capitals, as close to the poster voice as email allows. */
export function heading(text: string): string {
  return `<h1 style="margin:12px 0 0;font:800 30px/1.05 ${EMAIL_POSTER};text-transform:uppercase;letter-spacing:0.01em;color:${C.bone};">${escapeHtml(text)}</h1>`;
}

/** A paragraph of body text. Single line breaks are kept. */
export function paragraph(text: string): string {
  return `<p style="margin:16px 0 0;font:400 15px/1.6 ${EMAIL_SANS};color:${C.bone};">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

/** The one action an email asks for: a solid bone pill, like the site's. */
export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-radius:999px;background:${C.bone};">
  <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font:700 12px/1 ${EMAIL_SANS};letter-spacing:0.14em;text-transform:uppercase;color:${C.page};text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

/** A row of the card: content padded to the card's measure. */
export function row(inner: string, top = 28): string {
  return `
      <tr><td style="padding:${top}px 32px 0;">${inner}</td></tr>`;
}

/**
 * The whole document: logo, the rows given, then a quiet footer.
 * `site` is the site's address without a trailing slash; "" makes every
 * link relative (Studio's preview frame resolves those against itself).
 */
export function emailDocument({
  site,
  title,
  preheader,
  rows,
  footer,
}: {
  site: string;
  title: string;
  preheader: string;
  rows: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};">
      <tr><td align="center" style="padding:36px 32px 8px;">
        <a href="${escapeHtml(site)}/" style="text-decoration:none;"><img src="${escapeHtml(site)}/brand/bad-era-primary-white.png" width="230" height="72" alt="BAD ERA" style="display:block;width:230px;height:72px;border:0;"></a>
      </td></tr>${rows}
      <tr><td style="padding:32px;">
        <div style="border-top:1px solid ${C.line};padding-top:20px;font:400 12px/1.6 ${EMAIL_SANS};color:${C.steel};">${footer}</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Join plain-text lines, never leaving two blank lines in a row. */
export function plainText(lines: string[]): string {
  return lines
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n")
    .trim();
}
