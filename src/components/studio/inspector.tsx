"use client";

import { MEDIA_PICKER_NONE } from "@/components/studio/editor-types";
import type { InspectorField } from "@/lib/cms/registry";
import type { MediaAsset } from "@/lib/studio/media-types";

/**
 * Schema-generated inspector (Master Spec §11.4.1, §11.4.3).
 *
 * Renders a section's editable fields from its registry definition — never a
 * hand-built form per section. Adding a section type therefore cannot forget
 * its inspector.
 *
 * The field kinds are a closed set: text, textarea, media, cta, product list,
 * repeater. There is no colour, font, size, spacing, CSS or HTML field, and
 * that absence is the guardrail (Master Spec §11.4.4).
 */
export function Inspector({
  fields,
  value,
  media,
  onChange,
}: {
  fields: InspectorField[];
  value: Record<string, unknown>;
  media: MediaAsset[];
  onChange: (path: string, next: unknown) => void;
}) {
  return (
    <div className="space-y-7">
      {fields.map((field) => (
        <FieldRenderer
          key={field.path}
          field={field}
          value={value[field.path]}
          media={media}
          onChange={(next) => onChange(field.path, next)}
        />
      ))}
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  media,
  onChange,
}: {
  field: InspectorField;
  value: unknown;
  media: MediaAsset[];
  onChange: (next: unknown) => void;
}) {
  switch (field.kind) {
    case "text":
      return (
        <TextInput
          label={field.label}
          hint={field.hint}
          maxLength={field.maxLength}
          value={String(value ?? "")}
          onChange={onChange}
        />
      );

    case "textarea":
      return (
        <TextInput
          label={field.label}
          hint={field.hint}
          maxLength={field.maxLength}
          value={String(value ?? "")}
          onChange={onChange}
          multiline
        />
      );

    case "cta":
      return (
        <CtaInput
          label={field.label}
          value={value as { label: string; href: string; enabled: boolean }}
          onChange={onChange}
        />
      );

    case "media":
      return (
        <MediaInput
          label={field.label}
          value={value as MediaValue}
          media={media}
          onChange={onChange}
        />
      );

    case "productList":
      return (
        <ProductListInput
          label={field.label}
          hint={field.hint}
          max={field.max}
          value={(value as string[]) ?? []}
          onChange={onChange}
        />
      );

    case "repeater":
      return (
        <Repeater
          label={field.label}
          fields={field.fields}
          value={(value as Record<string, unknown>[]) ?? []}
          media={media}
          onChange={onChange}
        />
      );
  }
}

function TextInput({
  label,
  hint,
  maxLength,
  value,
  onChange,
  multiline,
}: {
  label: string;
  hint?: string;
  maxLength: number;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
}) {
  const remaining = maxLength - value.length;
  const near = remaining <= Math.max(8, Math.round(maxLength * 0.1));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="label text-ink-muted">{label}</label>
        {/* Character guidance, not a design control (Master Spec §11.3). */}
        <span className={`label ${near ? "text-state-warning" : "text-ink-disabled"}`}>
          {remaining}
        </span>
      </div>
      {multiline ? (
        <textarea
          rows={3}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full resize-y border border-line-strong bg-transparent px-3 py-2 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none"
        />
      ) : (
        <input
          type="text"
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      )}
      {hint ? <p className="mt-2 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function CtaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { label: string; href: string; enabled: boolean } | undefined;
  onChange: (next: unknown) => void;
}) {
  const cta = value ?? { label: "", href: "/", enabled: false };
  const set = (patch: Partial<typeof cta>) => onChange({ ...cta, ...patch });

  return (
    <fieldset className="border border-line p-4">
      <legend className="label px-2 text-ink-muted">{label}</legend>

      <label className="mt-1 flex items-center gap-3">
        <input
          type="checkbox"
          checked={cta.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
          className="size-4 accent-[var(--color-accent)]"
        />
        <span className="text-sm text-ink">Show this action</span>
      </label>

      <div className="mt-4 space-y-3">
        <div>
          <label className="label block text-ink-subtle">Label</label>
          <input
            type="text"
            maxLength={40}
            value={cta.label}
            onChange={(e) => set({ label: e.target.value })}
            className="mt-1.5 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="label block text-ink-subtle">Destination</label>
          <input
            type="text"
            value={cta.href}
            onChange={(e) => set({ href: e.target.value })}
            placeholder="/shop"
            className="mt-1.5 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-disabled focus:border-ink focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-ink-subtle">
            An internal path like /shop, or a full https:// URL.
          </p>
        </div>
      </div>
    </fieldset>
  );
}

type MediaValue = {
  mediaAssetId: string | null;
  alt: string;
  focalDesktop: { x: number; y: number };
  focalMobile: { x: number; y: number };
  placeholderLabel: string;
};

function MediaInput({
  label,
  value,
  media,
  onChange,
}: {
  label: string;
  value: MediaValue | undefined;
  media: MediaAsset[];
  onChange: (next: unknown) => void;
}) {
  const slot: MediaValue = value ?? {
    mediaAssetId: null,
    alt: "",
    focalDesktop: { x: 0.5, y: 0.5 },
    focalMobile: { x: 0.5, y: 0.5 },
    placeholderLabel: label,
  };
  const set = (patch: Partial<MediaValue>) => onChange({ ...slot, ...patch });

  return (
    <fieldset className="border border-line p-4">
      <legend className="label px-2 text-ink-muted">{label}</legend>

      <div className="mt-1">
        <label className="label block text-ink-subtle">Image</label>
        <select
          value={slot.mediaAssetId ?? MEDIA_PICKER_NONE}
          onChange={(e) =>
            set({
              mediaAssetId:
                e.target.value === MEDIA_PICKER_NONE ? null : e.target.value,
            })
          }
          className="mt-1.5 w-full border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        >
          <option value={MEDIA_PICKER_NONE}>
            No image — shows a placeholder
          </option>
          {media.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.originalFilename ?? asset.storagePath}
            </option>
          ))}
        </select>
        {media.length === 0 ? (
          <p className="mt-1.5 text-xs text-ink-subtle">
            Upload photography in Media first.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <label className="label block text-ink-subtle">Alt text</label>
        <input
          type="text"
          maxLength={300}
          value={slot.alt}
          onChange={(e) => set({ alt: e.target.value })}
          className="mt-1.5 w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      {/* Desktop and mobile crop independently (Master Spec §3.2). */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FocalControl
          heading="Desktop focus"
          value={slot.focalDesktop}
          onChange={(focalDesktop) => set({ focalDesktop })}
        />
        <FocalControl
          heading="Mobile focus"
          value={slot.focalMobile}
          onChange={(focalMobile) => set({ focalMobile })}
        />
      </div>
    </fieldset>
  );
}

function FocalControl({
  heading,
  value,
  onChange,
}: {
  heading: string;
  value: { x: number; y: number };
  onChange: (next: { x: number; y: number }) => void;
}) {
  return (
    <div>
      <p className="label text-ink-subtle">{heading}</p>
      <div className="mt-2 space-y-2">
        {(["x", "y"] as const).map((axis) => (
          <label key={axis} className="flex items-center gap-3">
            <span className="label w-3 text-ink-disabled">{axis}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={value[axis]}
              onChange={(e) => onChange({ ...value, [axis]: Number(e.target.value) })}
              className="w-full accent-[var(--color-accent)]"
            />
            <span className="label w-8 text-right text-ink-subtle">
              {Math.round(value[axis] * 100)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ProductListInput({
  label,
  hint,
  max,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  max: number;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <label className="label block text-ink-muted">{label}</label>
      <div className="mt-2 space-y-2">
        {value.map((handle, index) => (
          <div key={`${handle}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={handle}
              onChange={(e) => {
                const next = [...value];
                next[index] = e.target.value;
                onChange(next);
              }}
              className="w-full border border-line-strong bg-transparent px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label={`Remove ${handle}`}
              className="label shrink-0 px-2 text-ink-subtle transition-colors hover:text-state-critical"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {value.length < max ? (
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          className="label mt-3 border border-line-strong px-4 py-2 text-ink-muted transition-colors hover:border-ink hover:text-ink"
        >
          Add product
        </button>
      ) : null}
      {hint ? <p className="mt-2 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

function Repeater({
  label,
  fields,
  value,
  media,
  onChange,
}: {
  label: string;
  fields: InspectorField[];
  value: Record<string, unknown>[];
  media: MediaAsset[];
  onChange: (next: unknown) => void;
}) {
  return (
    <div>
      <p className="label text-ink-muted">{label}</p>
      <div className="mt-3 space-y-4">
        {value.map((item, index) => (
          <fieldset key={index} className="border border-line p-4">
            <legend className="label px-2 text-ink-subtle">
              {index + 1}
            </legend>
            <div className="mt-1 space-y-5">
              {fields.map((field) => (
                <FieldRenderer
                  key={field.path}
                  field={field}
                  value={item[field.path]}
                  media={media}
                  onChange={(next) => {
                    const updated = [...value];
                    updated[index] = { ...item, [field.path]: next };
                    onChange(updated);
                  }}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
