"use client";

/** Last-resort error screen (errors in the root layout or providers, e.g. the wallet SDK). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0d0e10", color: "#f4f4ef", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#9d9ea3", fontSize: 15 }}>The app hit an unexpected error. Your funds are not affected.</p>
          <pre style={{ textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#16171a", border: "1px solid #232428", borderRadius: 16, padding: "12px 16px", fontSize: 12, color: "#ff6b5c" }}>
            {error.message || "Unknown error"}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
          <button onClick={reset} style={{ marginTop: 16, height: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#d9f36a", color: "#101114", fontWeight: 600, fontSize: 15 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
