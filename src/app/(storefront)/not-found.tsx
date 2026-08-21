import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-section">
      <p className="label text-ink-subtle">404</p>
      <h1 className="mt-6 font-display text-display-md text-ink-strong">
        Not found
      </h1>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-muted">
        That page has moved or never existed.
      </p>
      <div className="mt-10">
        <Link
          href="/"
          className="label inline-flex items-center border border-ink/70 px-9 py-4 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-inverse-ink"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
