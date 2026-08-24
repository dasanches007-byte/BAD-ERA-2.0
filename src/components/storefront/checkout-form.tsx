"use client";

import { useState, useTransition } from "react";

/**
 * Checkout details (Master Spec §6.2).
 *
 * This form collects the two things `createCheckout` needs that the cart does
 * not already know: an email and a shipping address. It then hands off to
 * Stripe Checkout, which collects payment.
 *
 * WHAT THIS FORM DELIBERATELY DOES NOT DO:
 *
 *   - it does not touch prices. `cart_items` stores variant and quantity only,
 *     and the price is read fresh server-side and frozen into the snapshot. A
 *     hidden price field here would be the classic tampering vector.
 *   - it does not reserve inventory. The reservation happens inside the atomic
 *     `reserve_checkout_inventory` RPC on the server, under row locks.
 *   - it does not quote shipping. The flat rate is a Studio setting, and
 *     checkout fails loudly if it is unset rather than inventing a number.
 *
 * The address is validated server-side by `shippingAddressSchema`. The client
 * `required` attributes are a convenience, never the boundary.
 */
export function CheckoutForm({ email }: { email: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const response = await fetch("/api/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.get("email"),
            shippingAddress: {
              name: form.get("name"),
              line1: form.get("line1"),
              line2: form.get("line2") || undefined,
              city: form.get("city"),
              region: form.get("region"),
              postalCode: form.get("postalCode"),
              country: form.get("country"),
              phone: form.get("phone") || undefined,
            },
          }),
        });

        const payload = (await response.json()) as {
          redirectUrl?: string;
          message?: string;
          error?: string;
        };

        if (!response.ok || !payload.redirectUrl) {
          // The server sends a safe, customer-facing message for the failures
          // that are actionable (cart expired, item unavailable, rate limited).
          setError(
            payload.message ??
              "We could not start checkout. Please try again in a moment.",
          );
          return;
        }

        // Full navigation, not a router push: Stripe Checkout is a different
        // origin and must own the whole page.
        window.location.assign(payload.redirectUrl);
      } catch {
        setError("We could not reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate={false}>
      <fieldset disabled={pending} className="border-0 p-0">
        <legend className="label text-ink-subtle">Contact</legend>
        <div className="mt-5">
          <Field
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            defaultValue={email ?? ""}
            required
          />
          <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
            Your order confirmation and shipping updates go here.
          </p>
        </div>

        <legend className="label mt-12 text-ink-subtle">Shipping address</legend>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field
            name="name"
            label="Recipient name"
            autoComplete="name"
            required
            className="sm:col-span-2"
          />
          <Field
            name="line1"
            label="Address"
            autoComplete="address-line1"
            required
            className="sm:col-span-2"
          />
          <Field
            name="line2"
            label="Apartment, suite, unit"
            autoComplete="address-line2"
            className="sm:col-span-2"
          />
          <Field name="city" label="City" autoComplete="address-level2" required />
          <Field
            name="region"
            label="State / region"
            autoComplete="address-level1"
            required
          />
          <Field
            name="postalCode"
            label="Postal code"
            autoComplete="postal-code"
            required
          />
          <Field
            name="country"
            label="Country code"
            autoComplete="country"
            defaultValue="US"
            maxLength={2}
            required
          />
          <Field
            name="phone"
            label="Phone (optional)"
            type="tel"
            autoComplete="tel"
            className="sm:col-span-2"
          />
        </div>

        {error ? (
          <p
            aria-live="polite"
            role="alert"
            className="mt-8 text-sm leading-relaxed text-state-critical"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="label mt-10 flex w-full items-center justify-center border border-ink/70 px-8 py-5 text-ink transition-colors duration-[var(--animate-duration-base)] hover:border-ink hover:bg-ink hover:text-inverse-ink disabled:cursor-not-allowed disabled:border-line disabled:text-ink-disabled disabled:hover:bg-transparent"
        >
          {pending ? "Taking you to payment…" : "Continue to payment"}
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-ink-subtle">
          Payment is handled by Stripe. BAD ERA never sees your card details.
        </p>
      </fieldset>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  className,
  type = "text",
  autoComplete,
  maxLength,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label block text-ink-subtle">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        className="mt-2 w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink transition-colors focus:border-ink/60 focus:outline-none"
      />
    </div>
  );
}
