import type { CSSProperties } from "react";

/**
 * The poster voice and the two marks that go with it (cement design,
 * owner-approved 12 November 2026).
 *
 * A poster is the owner's words set very condensed and very heavy, sized to
 * fill its column and broken into lines that rise into place the first time
 * they are seen. The owner writes words; everything about how they are set is
 * fixed here and in globals.css (`.poster`). Nothing in a poster's text can
 * change its face, size or colour.
 *
 * Server-safe and pure, so the same markup renders on the page, in both
 * editors and in tests.
 */

export type PosterWord = { text: string; em: boolean };

/** Longest line the automatic breaks aim for, in letters. */
const WRAP_AT = 10;
/** How far over that a line the owner broke by hand may run and be left alone. */
const LEEWAY = 4;

const lengthOf = (line: PosterWord[]) =>
  line.reduce((n, word) => n + word.text.length, 0) + Math.max(0, line.length - 1);

function words(line: string, state: { em: boolean }, marks: boolean): PosterWord[] {
  const out: PosterWord[] = [];
  let current = "";
  const push = () => {
    if (current) out.push({ text: current, em: state.em });
    current = "";
  };
  for (const ch of line) {
    if (marks && ch === "*") {
      push();
      state.em = !state.em;
    } else if (/\s/.test(ch)) {
      push();
    } else {
      current += ch;
    }
  }
  push();
  return out;
}

function wrap(line: PosterWord[], width: number): PosterWord[][] {
  const lines: PosterWord[][] = [];
  let current: PosterWord[] = [];
  let length = 0;
  for (const word of line) {
    const next = current.length === 0 ? word.text.length : length + 1 + word.text.length;
    if (current.length > 0 && next > width) {
      lines.push(current);
      current = [word];
      length = word.text.length;
    } else {
      current.push(word);
      length = next;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/**
 * How wide each character sets in the poster face, in ems: Archivo at 62%
 * width, weight 800, with the poster's tracking. Measured from the face
 * itself. It is what lets a poster be sized to its column before the page
 * is drawn, whatever the owner writes: an M is three times an I, so counting
 * letters is not enough.
 */
const ADVANCE: Record<string, number> = {
  A: 0.488, B: 0.47, C: 0.493, D: 0.491, E: 0.44, F: 0.383, G: 0.52, H: 0.492, I: 0.231,
  J: 0.414, K: 0.489, L: 0.399, M: 0.665, N: 0.496, O: 0.531, P: 0.46, Q: 0.531, R: 0.486,
  S: 0.442, T: 0.446, U: 0.483, V: 0.461, W: 0.691, X: 0.475, Y: 0.468, Z: 0.451,
  "0": 0.415, "1": 0.349, "2": 0.405, "3": 0.412, "4": 0.402, "5": 0.414, "6": 0.415,
  "7": 0.368, "8": 0.403, "9": 0.415,
  ".": 0.2, ",": 0.2, "!": 0.246, "?": 0.397, "'": 0.187, "\u2019": 0.187, '"': 0.352,
  "&": 0.522, "-": 0.228, ":": 0.209, ";": 0.209, "/": 0.259, "(": 0.353, ")": 0.353,
  $: 0.365, "%": 0.692, "+": 0.497, "#": 0.468, "@": 0.667, "*": 0.357, " ": 0.105,
};
/** Anything not measured is taken as wide, so it can only set smaller. */
const UNKNOWN_ADVANCE = 0.7;

/** A line's set width in ems, as the poster face will draw it (capitals). */
export function posterLineWidth(line: PosterWord[]): number {
  const text = line.map((word) => word.text).join(" ").toUpperCase();
  let width = 0;
  for (const ch of text) width += ADVANCE[ch] ?? UNKNOWN_ADVANCE;
  return width;
}

/**
 * Break poster text into lines.
 *
 * A line break the owner typed is always kept. A line longer than `wrapAt`
 * letters is broken into as few lines as fit, then evened out, so "Dress like
 * you run it." sets as Dress / like you / run it. rather than leaving one
 * word alone on the last line. Where the owner has chosen the breaks
 * themselves, a line only a little over is left as they wrote it. A word
 * between *stars* is emphasised; a lone star is just a star.
 */
export function posterLines(text: string, wrapAt = WRAP_AT): PosterWord[][] {
  const marks = (text.match(/\*/g) ?? []).length % 2 === 0;
  const state = { em: false };
  const lines: PosterWord[][] = [];
  const chosen = /\S\s*\n\s*\S/.test(text);
  for (const raw of text.split(/\r?\n/)) {
    const line = words(raw, state, marks);
    if (line.length === 0) continue;
    const greedy = wrap(line, wrapAt);
    if (greedy.length === 1 || (chosen && lengthOf(line) <= wrapAt + LEEWAY)) {
      lines.push(line);
      continue;
    }
    // The narrowest width that still needs no more lines: the even split.
    let low = Math.max(...line.map((word) => word.text.length));
    let high = wrapAt;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (wrap(line, mid).length <= greedy.length) high = mid;
      else low = mid + 1;
    }
    lines.push(...wrap(line, Math.max(low, 1)));
  }
  return lines;
}

/** The words of a poster as plain text, stars removed: for labels and tests. */
export function posterText(text: string): string {
  return posterLines(text, Number.MAX_SAFE_INTEGER)
    .map((line) => line.map((word) => word.text).join(" "))
    .join(" ");
}

type PosterTag = "h1" | "h2" | "h3" | "p";

/**
 * A poster headline.
 *
 * `cap` and `max` are the design's own limits for where the poster sits (a
 * share of the column, and a ceiling), never content. `fill` is how much of
 * the screen's height all its lines may take together.
 */
export function Poster({
  as: Tag = "h2",
  text,
  id,
  className,
  cap,
  max,
  fill,
  wrapAt,
  rise = true,
  edit,
}: {
  as?: PosterTag;
  text: string;
  id?: string;
  className?: string;
  /** Largest size as a share of the column, e.g. "31cqi". */
  cap?: string;
  /** Largest size outright, e.g. "18rem". */
  max?: string;
  /** Height all the lines may fill together, e.g. "75vh". */
  fill?: string;
  wrapAt?: number;
  /** Lines rise into place the first time they are seen. */
  rise?: boolean;
  /** Edit-target attributes, present only while an owner is editing. */
  edit?: Record<string, string>;
}) {
  const lines = posterLines(text, wrapAt);
  // The widest line decides the size: it must fit the column.
  const widest = Math.max(1.2, ...lines.map(posterLineWidth));
  const style = {
    "--w": Number(widest.toFixed(3)),
    "--l": Math.max(1, lines.length),
    ...(cap ? { "--poster-cap": cap } : {}),
    ...(max ? { "--poster-max": max } : {}),
    ...(fill ? { "--poster-fill": fill } : {}),
  } as CSSProperties;

  return (
    <div className={`poster-box ${className ?? ""}`}>
      <Tag
        {...edit}
        id={id}
        className="poster poster-fit"
        style={style}
        {...(rise ? { "data-rise": "" } : {})}
      >
        {lines.map((line, index) => (
          <span key={index} className="poster-line">
            <span>
              {line.map((word, at) => (
                <PosterWordSpan key={at} word={word} first={at === 0} />
              ))}
            </span>
            {/* Lines are blocks; this keeps the words apart for anything that
                reads the heading as one string. */}
            {index < lines.length - 1 ? " " : null}
          </span>
        ))}
      </Tag>
    </div>
  );
}

function PosterWordSpan({ word, first }: { word: PosterWord; first: boolean }) {
  return (
    <>
      {first ? null : " "}
      {word.em ? <em>{word.text}</em> : word.text}
    </>
  );
}

/** The seam: a stitched line set in from the edge of a cement slab. */
export function Stitch() {
  return (
    <svg className="stitch" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="100%" height="100%" rx="10" />
    </svg>
  );
}

/** The arrow on a pill. */
export function Arrow() {
  return (
    <svg viewBox="0 0 18 10" aria-hidden="true" focusable="false">
      <path d="M0 5h16.5M12.5 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
