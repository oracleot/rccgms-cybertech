/**
 * Shown in place of the operator dock when no valid dock key is present. It
 * renders zero operator controls — the whole point of the gate — just an
 * explanation. The key is never shown or hinted at here.
 */
export function DockLocked() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0b12",
        color: "#c7c7d6",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 340 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Operator key required</div>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: "#8b8ba3" }}>
          This control dock is protected. Open it using the operator link your administrator provided. The read-only
          monitor and the on-screen display don&apos;t need a key.
        </p>
      </div>
    </div>
  )
}
