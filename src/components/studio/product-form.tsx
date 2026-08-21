"use client";

import { useState, useTransition } from "react";

import { updateProductAction } from "@/lib/studio/product-actions";
import type { StudioProduct } from "@/lib/studio/product-types";

/**
 * Product editor form (Master Spec §10.3.2).
 *
 * Saves structured product data. It never creates a page component per product
 * — every product renders from the shared Editorial Commerce template.
 *
 * Note what is deliberately absent: no font controls, no colour pickers, no
 * layout or CSS fields. Studio edits content, not design (Master Spec §11.4.4).
 */
export function ProductForm({ product }: { product: StudioProduct }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);

  const [form, setForm] = useState({
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle ?? "",
    description: product.description ?? "",
    productType: product.productType ?? "",
    tags: product.tags.join(", "),
    status: product.status,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage(null);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProductAction({
        productId: product.id,
        title: form.title,
        handle: form.handle,
        subtitle: form.subtitle || null,
        description: form.description || null,
        productType: form.productType || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: form.status,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
      });
      setMessage(
        result.ok
          ? { tone: "ok", text: "Saved." }
          : { tone: "error", text: result.message },
      );
    });
  }

  return (
    <div className="space-y-6">
      <Section title="Product information">
        <Field
          id="title"
          label="Title"
          value={form.title}
          onChange={(v) => set("title", v)}
          hint="Shown on the product page and every card."
        />
        <Field
          id="handle"
          label="Handle"
          value={form.handle}
          onChange={(v) => set("handle", v)}
          hint={`Public URL: /products/${form.handle || "…"}. Changing it changes the live link.`}
        />
        <Field
          id="subtitle"
          label="Subtitle"
          value={form.subtitle}
          onChange={(v) => set("subtitle", v)}
          hint="One short supporting line. Keep it restrained."
        />
        <Field
          id="productType"
          label="Type"
          value={form.productType}
          onChange={(v) => set("productType", v)}
        />
        <Field
          id="tags"
          label="Tags"
          value={form.tags}
          onChange={(v) => set("tags", v)}
          hint="Comma separated. Used for filters such as Archive 01."
        />
        <SelectField
          id="status"
          label="Status"
          value={form.status}
          onChange={(v) => set("status", v as typeof form.status)}
          options={[
            { value: "draft", label: "Draft — not visible" },
            { value: "active", label: "Active — visible" },
            { value: "archived", label: "Archived — visible, not purchasable" },
          ]}
        />
      </Section>

      <Section title="Description">
        <TextareaField
          id="description"
          label="Details"
          value={form.description}
          onChange={(v) => set("description", v)}
          rows={7}
          hint="Materials, fit and care. Plain text — typography is locked to the template."
        />
      </Section>

      <Section title="SEO">
        <Field
          id="seoTitle"
          label="SEO title"
          value={form.seoTitle}
          onChange={(v) => set("seoTitle", v)}
          hint={`${form.seoTitle.length}/60 recommended`}
        />
        <TextareaField
          id="seoDescription"
          label="Meta description"
          value={form.seoDescription}
          onChange={(v) => set("seoDescription", v)}
          rows={3}
          hint={`${form.seoDescription.length}/160 recommended`}
        />
      </Section>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="label border border-ink/70 px-7 py-3 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {message ? (
          <span
            aria-live="polite"
            className={`label ${
              message.tone === "ok" ? "text-state-success" : "text-state-critical"
            }`}
          >
            {message.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hairline bg-surface-raised">
      <h2 className="label border-b border-line px-6 py-4 text-ink-subtle">
        {title}
      </h2>
      <div className="space-y-5 px-6 py-6">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      />
      {hint ? <p className="mt-2 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function TextareaField({
  id,
  label,
  value,
  onChange,
  rows,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full resize-y border border-line-strong bg-transparent px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none"
      />
      {hint ? <p className="mt-2 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="label block text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
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
