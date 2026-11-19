"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches errors anywhere under the root (including the wallet SDK's modal) and shows the message,
 * stack and component stack so a crash can be reported precisely. No secrets are ever in these.
 */
export class DebugBoundary extends Component<{ children: ReactNode }, { error: Error | null; info: string }> {
  state = { error: null as Error | null, info: "" };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
    this.setState({ info: info.componentStack ?? "" });
  }
  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    const stack = (error.stack ?? "").split("\n").slice(0, 14).join("\n");
    const comps = info.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 14).join("\n");
    return (
      <div style={{ minHeight: "100vh", background: "#0d0e10", color: "#f4f4ef", fontFamily: "system-ui, sans-serif", padding: 20 }}>
        <h1 style={{ fontSize: 22, margin: "24px 0 6px" }}>Something went wrong</h1>
        <p style={{ color: "#9d9ea3", fontSize: 14, margin: 0 }}>Your funds are not affected. Screenshot this box for support.</p>
        <pre style={{ marginTop: 14, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#16171a", border: "1px solid #232428", borderRadius: 14, padding: 12, fontSize: 11, lineHeight: 1.45, color: "#ffb3a8" }}>
          {error.message}
          {"\n\n— stack —\n"}
          {stack}
          {"\n\n— components —\n"}
          {comps}
        </pre>
        <button onClick={() => location.reload()} style={{ marginTop: 12, height: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#d9f36a", color: "#101114", fontWeight: 600 }}>Reload</button>
      </div>
    );
  }
}
