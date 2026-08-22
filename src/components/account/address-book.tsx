"use client";

import { useState, useTransition } from "react";

import { deleteAddressAction, saveAddressAction } from "@/lib/account/actions";
import type { SavedAddress } from "@/lib/account/query-types";

/**
 * Saved addresses (Master Spec §7).
 *
 * A customer may edit their address book freely. This never rewrites the
 * address snapshot on a past order — those are immutable, so history keeps
 * showing where a parcel actually went.
 */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);

  return (
    <div className="space-y-8">
      {addresses.length === 0 ? (
        <p className="max-w-md text-sm leading-relaxed text-ink-muted">
          No saved addresses yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => setEditing(address)}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <AddressForm
          address={editing === "new" ? null : editing}
          onDone={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="label border border-ink/70 px-8 py-3.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink"
        >
          Add address
        </button>
      )}
    </div>
  );
}

function AddressCard({
  address,
  onEdit,
}: {
  address: SavedAddress;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="hairline bg-surface-raised p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="label text-ink-subtle">{address.label ?? "Address"}</p>
        {address.isDefaultShipping ? (
          <span className="label text-accent">Default</span>
        ) : null}
      </div>
      <address className="mt-4 text-sm not-italic leading-relaxed text-ink-muted">
        {address.recipientName}
        <br />
        {address.line1}
        {address.line2 ? (
          <>
            <br />
            {address.line2}
          </>
        ) : null}
        <br />
        {address.city}, {address.region} {address.postalCode}
        <br />
        {address.countryCode}
      </address>
      <div className="mt-5 flex items-center gap-5">
        <button
          type="button"
          onClick={onEdit}
          className="label text-ink-muted transition-colors hover:text-ink"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await deleteAddressAction(address.id);
              if (!result.ok) setError(result.message);
            });
          }}
          className="label text-ink-subtle transition-colors hover:text-state-critical disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {error ? (
        <p aria-live="polite" className="label mt-3 text-state-critical">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function AddressForm({
  address,
  onDone,
}: {
  address: SavedAddress | null;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await saveAddressAction(formData);
          if (result.ok) onDone();
          else setError(result.message);
        });
      }}
      className="hairline max-w-2xl bg-surface-raised p-7"
    >
      {address ? (
        <input type="hidden" name="addressId" value={address.id} />
      ) : null}

      <h3 className="label text-ink-subtle">
        {address ? "Edit address" : "New address"}
      </h3>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field name="label" label="Label" defaultValue={address?.label ?? ""} />
        <Field
          name="recipientName"
          label="Recipient name"
          defaultValue={address?.recipientName ?? ""}
          required
        />
        <Field name="company" label="Company" defaultValue={address?.company ?? ""} />
        <Field name="phone" label="Phone" defaultValue={address?.phone ?? ""} />
        <Field
          name="line1"
          label="Address"
          defaultValue={address?.line1 ?? ""}
          required
          className="sm:col-span-2"
        />
        {/* Apartment / unit is preserved as its own line (Master Spec §6.2). */}
        <Field
          name="line2"
          label="Apartment, suite, unit"
          defaultValue={address?.line2 ?? ""}
          className="sm:col-span-2"
        />
        <Field name="city" label="City" defaultValue={address?.city ?? ""} required />
        <Field
          name="region"
          label="State / region"
          defaultValue={address?.region ?? ""}
          required
        />
        <Field
          name="postalCode"
          label="Postal code"
          defaultValue={address?.postalCode ?? ""}
          required
        />
        <Field
          name="countryCode"
          label="Country code"
          defaultValue={address?.countryCode ?? "US"}
          required
        />
      </div>

      <label className="mt-6 flex items-center gap-3">
        <input
          type="checkbox"
          name="isDefaultShipping"
          defaultChecked={address?.isDefaultShipping ?? false}
          className="size-4 accent-[var(--color-accent)]"
        />
        <span className="text-sm text-ink">Use as my default shipping address</span>
      </label>

      {error ? (
        <p aria-live="polite" className="label mt-5 text-state-critical">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex items-center gap-5">
        <button
          type="submit"
          disabled={pending}
          className="label border border-ink/70 px-8 py-3.5 text-ink transition-colors hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
        >
          {pending ? "Saving…" : "Save address"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="label text-ink-subtle transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  className,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label block text-ink-subtle">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full border border-line-strong bg-transparent px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </div>
  );
}
