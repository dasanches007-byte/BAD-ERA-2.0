"use client";

/**
 * Last-resort error boundary (Master Spec §17).
 *
 * This replaces the root layout entirely, so it must render its own <html> and
 * <body> and cannot use any shared component, font variable or design token —
 * the failure it is catching may be in exactly those. Hence the inline styles,
 * which are otherwise never used in this codebase.
 *
 * The `digest` is Next's server-side error id. Showing it lets the owner match
 * what a customer saw against a specific server log line, without putting the
 * message itself — which may name a table, a column or a provider — on screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          color: "#f4f1ec",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#8a8078",
              margin: 0,
            }}
          >
            BAD ERA
          </p>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 400,
              margin: "1.5rem 0 0",
              fontFamily: "ui-serif, Georgia, serif",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: "#a8a099",
              margin: "1rem 0 0",
            }}
          >
            This one is on us, not on you. Nothing you were doing was lost.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.5rem",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#f4f1ec",
              background: "transparent",
              border: "1px solid #3a3532",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                fontSize: "0.6875rem",
                color: "#6b6259",
                margin: "2rem 0 0",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
