"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setProductStatusAction } from "@/lib/studio/product-actions";

/**
 * Whether a product is on the store, and the one button that changes it.
 *
 * A new product is created hidden. This is where it goes live, after its
 * photos are in — and where it can be taken back off without deleting
 * anything. Archived products are left to the General tab's status field.
 */
export function ProductLiveBar({
  productId,
  status,
  photoCount,
  handle,
}: {
  productId: string;
  status: "draft" | "active" | "archived";
  photoCount: number;
  handle: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "archived") return null;
  const live = status === "active";

  function change(next: "active" | "draft") {
    setError(null);
    startTransition(async () => {
      const result = await setProductStatusAction({ productId, status: next }).catch(() => ({
        ok: false as const,
        message: "The connection dropped. Try again.",
      }));
      if (!result.ok) setError(result.message);
      else router.refresh();
    });
  }

  return (
    <section
      className={`flex flex-col gap-4 border px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${
        live ? "border-line bg-surface-raised" : "border-state-warning/40 bg-surface-raised"
      }`}
    >
      <div>
        <p className={`label ${live ? "text-state-success" : "text-state-warning"}`}>
          {live ? "● Live on the store" : "○ Hidden from the store"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {live ? (
            <>
              Customers can see and buy it at{" "}
              <a href={`/products/${handle}`} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
                /products/{handle}
              </a>
              .
            </>
          ) : photoCount === 0 ? (
            "Add its photos first — until then the store would show a placeholder."
          ) : (
            "When the details and stock are right, make it live."
          )}
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-state-critical">
            {error}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => change(live ? "draft" : "active")}
        className={`label min-h-12 shrink-0 border px-6 transition-colors disabled:cursor-wait disabled:opacity-60 ${
          live
            ? "border-line-strong text-ink-muted hover:border-ink hover:text-ink"
            : "border-ink/70 text-ink hover:bg-ink hover:text-inverse-ink"
        }`}
      >
        {pending ? "Saving…" : live ? "Hide from the store" : "Make it live"}
      </button>
    </section>
  );
}
