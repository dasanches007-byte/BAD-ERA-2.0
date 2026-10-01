"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { createProductAction } from "@/lib/studio/product-actions";
import {
  ARCHIVE_STARTERS,
  SIZES,
  checkNewProduct,
  combinations,
  expandSet,
  parsePrice,
  slugify,
  standardOptions,
  variantKey,
  variantTitle,
  type NewProductInput,
  type SetPieceCandidate,
  type Size,
  type Starter,
} from "@/lib/studio/new-product-types";

/**
 * New product (Studio → Products → New product).
 *
 * Written for the owner, not for a database: "a single product" or "a set",
 * a name, a price, the sizes it comes in, one more choice such as colour, and
 * how many are on the shelf right now. The three Archive 01 pieces are one tap
 * each. Everything is previewed before it is created, and it is created
 * hidden — going live is a separate button once photos are in.
 *
 * No design controls: like every Studio form, this edits content only.
 */

type State = {
  kind: "standard" | "bundle";
  title: string;
  handle: string;
  handleTouched: boolean;
  subtitle: string;
  productType: string;
  archive01: boolean;
  price: string;
  sizes: Size[];
  hasSecond: boolean;
  secondName: string;
  secondValues: string[];
  stock: Record<string, string>;
  pieces: { productId: string; label: string }[];
};

const EMPTY: State = {
  kind: "standard",
  title: "",
  handle: "",
  handleTouched: false,
  subtitle: "",
  productType: "",
  archive01: false,
  price: "",
  sizes: [],
  hasSecond: false,
  secondName: "Color",
  secondValues: [""],
  stock: {},
  pieces: [
    { productId: "", label: "" },
    { productId: "", label: "" },
  ],
};

export function NewProductForm({
  candidates,
  existingHandles,
}: {
  candidates: SetPieceCandidate[];
  existingHandles: string[];
}) {
  const router = useRouter();
  const [state, setState] = useState<State>(EMPTY);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<State>) => {
    setServerError(null);
    setState((s) => ({ ...s, ...patch }));
  };

  const input = toInput(state);
  const problems = listProblems(state, input, candidates, existingHandles);

  const standardRows = combinations(standardOptions(state.sizes, input.second));
  const resolvedPieces = state.pieces.map((p) => candidates.find((c) => c.productId === p.productId));
  const setPreview = resolvedPieces.every((c): c is SetPieceCandidate => Boolean(c))
    ? expandSet(
        state.pieces.map((p, i) => ({ label: p.label, candidate: resolvedPieces[i] as SetPieceCandidate })),
      )
    : null;

  function applyStarter(starter: Starter) {
    const pieces = starter.input.pieces.map((piece) => ({
      productId: candidates.find((c) => c.handle === piece.handle)?.productId ?? "",
      label: piece.label,
    }));
    setAttempted(false);
    setServerError(null);
    setState({
      ...EMPTY,
      kind: starter.input.kind,
      title: starter.input.title,
      handle: starter.input.handle,
      handleTouched: true,
      subtitle: starter.input.subtitle,
      productType: starter.input.productType,
      archive01: starter.input.archive01,
      price: (starter.input.priceCents / 100).toString(),
      sizes: [...starter.input.sizes],
      hasSecond: Boolean(starter.input.second),
      secondName: starter.input.second?.name ?? "Color",
      secondValues: starter.input.second ? [...starter.input.second.values] : [""],
      pieces: pieces.length > 0 ? pieces : EMPTY.pieces,
    });
  }

  function submit() {
    setAttempted(true);
    if (problems.length > 0) return;
    startTransition(async () => {
      const result = await createProductAction(input).catch(() => ({
        ok: false as const,
        message: "The connection dropped. Nothing was saved — try again.",
      }));
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      router.push(`/studio/products/${result.productId}/photos?created=1`);
    });
  }

  return (
    <div className="space-y-6">
      <Starters
        candidates={candidates}
        existingHandles={existingHandles}
        onPick={applyStarter}
      />

      <Section title="What it is">
        <div role="radiogroup" aria-label="Kind of product" className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["standard", "A single product", "A tee, a bag — something you count on the shelf."],
              ["bundle", "A set of other products", "Sold together, made of products you already have."],
            ] as const
          ).map(([kind, label, hint]) => (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={state.kind === kind}
              onClick={() => set({ kind })}
              className={`min-h-11 border px-4 py-3 text-left transition-colors ${
                state.kind === kind
                  ? "border-ink bg-surface-overlay"
                  : "border-line-strong hover:border-ink-muted"
              }`}
            >
              <span className="label block text-ink">{label}</span>
              <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>
            </button>
          ))}
        </div>

        <TextField
          label="Name"
          value={state.title}
          onChange={(title) =>
            set(state.handleTouched ? { title } : { title, handle: slugify(title) })
          }
          hint="Shown on the product page and every card."
        />
        <TextField
          label="Web address"
          prefix="/products/"
          value={state.handle}
          onChange={(handle) => set({ handle: handle.toLowerCase(), handleTouched: true })}
          hint="Filled in from the name. Lower-case words joined by hyphens."
        />
        <TextField
          label="Short line under the name (optional)"
          value={state.subtitle}
          onChange={(subtitle) => set({ subtitle })}
        />
        <TextField
          label="Price"
          prefix="$"
          inputMode="decimal"
          value={state.price}
          onChange={(price) => set({ price })}
          hint={
            state.kind === "bundle"
              ? "The price of the whole set."
              : "Every size and colour starts at this price. You can change one later under Variants."
          }
        />
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={state.archive01}
            onChange={(e) => set({ archive01: e.target.checked })}
            className="mt-1 size-4 accent-[var(--color-ink)]"
          />
          <span>
            <span className="label block text-ink">Part of Archive 01</span>
            <span className="mt-1 block text-xs text-ink-subtle">
              Shows the ARCHIVE 01 label and &ldquo;Limited quantities. Never restocked.&rdquo;
            </span>
          </span>
        </label>
      </Section>

      {state.kind === "standard" ? (
        <>
          <Section title="Choices">
            <div>
              <p className="label text-ink-muted">Sizes</p>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Sizes">
                {SIZES.map((size) => {
                  const on = state.sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set({
                          sizes: on ? state.sizes.filter((s) => s !== size) : [...state.sizes, size],
                        })
                      }
                      className={`label min-h-11 min-w-14 border px-4 transition-colors ${
                        on ? "border-ink bg-ink text-inverse-ink" : "border-line-strong text-ink hover:border-ink"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ink-subtle">
                Leave them all off if it has no sizes. Sizes are S, M, L and XL only.
              </p>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={state.hasSecond}
                onChange={(e) => set({ hasSecond: e.target.checked })}
                className="size-4 accent-[var(--color-ink)]"
              />
              <span className="label text-ink">It comes in another choice, like colour</span>
            </label>

            {state.hasSecond ? (
              <div className="space-y-4 border-l border-line pl-4">
                <TextField
                  label="What is the choice called?"
                  value={state.secondName}
                  onChange={(secondName) => set({ secondName })}
                />
                <div>
                  <p className="label text-ink-muted">{state.secondName.trim() || "Choices"}</p>
                  <ul className="mt-3 space-y-2">
                    {state.secondValues.map((value, index) => (
                      <li key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={value}
                          aria-label={`${state.secondName || "Choice"} ${index + 1}`}
                          maxLength={40}
                          onChange={(e) => {
                            const secondValues = [...state.secondValues];
                            secondValues[index] = e.target.value;
                            set({ secondValues });
                          }}
                          className="min-h-11 w-full border border-line-strong bg-transparent px-3 text-sm text-ink focus:border-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label={`Remove ${value || "this choice"}`}
                          onClick={() =>
                            set({
                              secondValues:
                                state.secondValues.length > 1
                                  ? state.secondValues.filter((_, i) => i !== index)
                                  : [""],
                            })
                          }
                          className="label min-h-11 border border-line-strong px-3 text-ink-muted hover:border-ink hover:text-ink"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => set({ secondValues: [...state.secondValues, ""] })}
                    className="label mt-3 min-h-11 border border-dashed border-line-strong px-4 text-ink-muted hover:border-ink hover:text-ink"
                  >
                    + Add another
                  </button>
                </div>
              </div>
            ) : null}
          </Section>

          <Section title="Stock you have now">
            <p className="text-xs leading-relaxed text-ink-subtle">
              Count what is physically here. Leave a box empty for none. You can change these any
              time under Inventory, and every count is recorded in the stock history.
            </p>
            <ul className="divide-y divide-line border-y border-line">
              {standardRows.map((values) => {
                const key = variantKey(values);
                return (
                  <li key={key} className="flex min-h-14 items-center justify-between gap-4 py-2">
                    <span className="text-sm text-ink">{variantTitle(values)}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      placeholder="0"
                      aria-label={`How many ${variantTitle(values)} you have`}
                      value={state.stock[key] ?? ""}
                      onChange={(e) => set({ stock: { ...state.stock, [key]: e.target.value } })}
                      className="min-h-11 w-24 border border-line-strong bg-transparent px-3 text-right text-sm text-ink focus:border-ink focus:outline-none"
                    />
                  </li>
                );
              })}
            </ul>
          </Section>
        </>
      ) : (
        <Section title="What's in the set">
          {candidates.length < 2 ? (
            <p className="text-sm leading-relaxed text-ink-muted">
              A set is made of products that already exist. Create its pieces first — for the
              Original Era Set, the Tee and the Crossbody.
            </p>
          ) : (
            <>
              <ul className="space-y-4">
                {state.pieces.map((piece, index) => (
                  <li key={index} className="grid gap-3 border border-line p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
                    <SelectField
                      label={`Piece ${index + 1}`}
                      value={piece.productId}
                      onChange={(productId) => {
                        const candidate = candidates.find((c) => c.productId === productId);
                        const pieces = [...state.pieces];
                        pieces[index] = {
                          productId,
                          label: piece.label || shortLabel(candidate),
                        };
                        set({ pieces });
                      }}
                      options={[
                        { value: "", label: "Choose a product" },
                        ...candidates.map((c) => ({ value: c.productId, label: c.title })),
                      ]}
                    />
                    <TextField
                      label="Short label"
                      value={piece.label}
                      onChange={(label) => {
                        const pieces = [...state.pieces];
                        pieces[index] = { ...piece, label };
                        set({ pieces });
                      }}
                    />
                    {state.pieces.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => set({ pieces: state.pieces.filter((_, i) => i !== index) })}
                        className="label min-h-11 border border-line-strong px-3 text-ink-muted hover:border-ink hover:text-ink"
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {state.pieces.length < 3 ? (
                <button
                  type="button"
                  onClick={() => set({ pieces: [...state.pieces, { productId: "", label: "" }] })}
                  className="label min-h-11 border border-dashed border-line-strong px-4 text-ink-muted hover:border-ink hover:text-ink"
                >
                  + Add another piece
                </button>
              ) : null}

              {setPreview && setPreview.variants.length > 0 ? (
                <div className="border-t border-line pt-5">
                  <p className="label text-ink-muted">
                    Customers choose {setPreview.options.map((o) => o.name).join(" and ") || "it"} ·{" "}
                    {setPreview.variants.length}{" "}
                    {setPreview.variants.length === 1 ? "combination" : "combinations"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
                    {setPreview.variants
                      .slice(0, 12)
                      .map((v) => variantTitle(v.values))
                      .join(" · ")}
                    {setPreview.variants.length > 12 ? " · …" : ""}
                  </p>
                </div>
              ) : null}
              <p className="text-xs leading-relaxed text-ink-subtle">
                A set never has its own stock. Each sale takes one of every piece from the same
                stock as buying them separately, so customers can buy as many sets as the scarcer
                piece allows.
              </p>
            </>
          )}
        </Section>
      )}

      <div className="space-y-4">
        {attempted && problems.length > 0 ? (
          <ul role="alert" className="space-y-1">
            {problems.map((problem) => (
              <li key={problem} className="text-sm text-state-critical">
                {problem}
              </li>
            ))}
          </ul>
        ) : null}
        {serverError ? (
          <p role="alert" className="text-sm text-state-critical">
            {serverError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="label min-h-12 border border-ink/70 px-8 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create product"}
          </button>
          <p className="text-xs text-ink-subtle">
            It stays hidden from the store until you make it live.
          </p>
        </div>
      </div>
    </div>
  );
}

function listProblems(
  state: State,
  input: NewProductInput,
  candidates: SetPieceCandidate[],
  existingHandles: string[],
): string[] {
  const found = checkNewProduct(input, candidates);
  if (existingHandles.includes(input.handle)) {
    found.unshift("Another product already uses that web address.");
  }
  if (parsePrice(state.price) === null) found.unshift("Enter a price, like 30 or 29.50.");
  return [...new Set(found)];
}

function toInput(state: State): NewProductInput {
  const stock: Record<string, number> = {};
  for (const [key, text] of Object.entries(state.stock)) {
    if (text.trim() === "") continue;
    stock[key] = Number(text);
  }
  return {
    kind: state.kind,
    title: state.title,
    handle: state.handle.trim(),
    subtitle: state.subtitle,
    productType: state.productType,
    archive01: state.archive01,
    priceCents: parsePrice(state.price) ?? 0,
    sizes: state.kind === "standard" ? state.sizes : [],
    second:
      state.kind === "standard" && state.hasSecond
        ? { name: state.secondName, values: state.secondValues }
        : null,
    stock: state.kind === "standard" ? stock : {},
    pieces: state.kind === "bundle" ? state.pieces : [],
  };
}

function shortLabel(candidate: SetPieceCandidate | undefined): string {
  if (!candidate) return "";
  return candidate.productType?.trim() || candidate.title.split(/\s+/).pop() || "";
}

function Starters({
  candidates,
  existingHandles,
  onPick,
}: {
  candidates: SetPieceCandidate[];
  existingHandles: string[];
  onPick: (starter: Starter) => void;
}) {
  return (
    <section className="hairline bg-surface-raised">
      <h2 className="label border-b border-line px-6 py-4 text-ink-subtle">Start from Archive 01</h2>
      <div className="space-y-4 px-6 py-6">
        <p className="text-xs leading-relaxed text-ink-subtle">
          Fills in the name, price and choices from the Archive 01 plan. You add the stock counts.
        </p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {ARCHIVE_STARTERS.map((starter) => {
            const exists = existingHandles.includes(starter.input.handle);
            const missing = starter.input.pieces.filter(
              (piece) => !candidates.some((c) => c.handle === piece.handle),
            );
            const blocked = exists || missing.length > 0;
            return (
              <li key={starter.key}>
                <button
                  type="button"
                  disabled={blocked}
                  onClick={() => onPick(starter)}
                  className="flex min-h-14 w-full flex-col items-start justify-center border border-line-strong px-4 py-3 text-left transition-colors hover:border-ink disabled:cursor-not-allowed disabled:border-line disabled:hover:border-line"
                >
                  <span className={`label ${blocked ? "text-ink-disabled" : "text-ink"}`}>{starter.label}</span>
                  <span className="mt-1 text-xs text-ink-subtle">
                    {exists
                      ? "Already created"
                      : missing.length > 0
                        ? "Create the Tee and Crossbody first"
                        : `$${starter.input.priceCents / 100}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="hairline bg-surface-raised">
      <h2 className="label border-b border-line px-6 py-4 text-ink-subtle">{title}</h2>
      <div className="space-y-5 px-6 py-6">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  hint,
  prefix,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  prefix?: string;
  inputMode?: "decimal" | "text";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <div className="mt-2 flex min-h-11 items-center border border-line-strong focus-within:border-ink">
        {prefix ? <span className="pl-3 text-sm text-ink-subtle">{prefix}</span> : null}
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-full bg-transparent px-3 text-sm text-ink focus:outline-none"
        />
      </div>
      {hint ? <p className="mt-2 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 min-h-11 w-full border border-line-strong bg-surface px-3 text-sm text-ink focus:border-ink focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
