import { BORD, GRIS, CREME } from "../theme";

export function Card({ children, style, ...props }) {
  return (
    <div
      style={{ background: "#fff", border: `1px solid ${BORD}`, borderRadius: 10, overflow: "hidden", ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({ label, bg, color }) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 10.5,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 20,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

export function KPI({ label, value, suffix, accent }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORD}`,
        borderTop: accent ? `3px solid ${accent}` : undefined,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 10, color: GRIS, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#1A1814" }}>
        {value} {suffix && <span style={{ fontSize: 12, color: GRIS, fontWeight: 400 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function Tbl({ columns, headers, children, minWidth }) {
  return (
    <Card style={{ maxWidth: minWidth }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          padding: "9px 14px",
          background: CREME,
          borderBottom: `1px solid ${BORD}`,
        }}
      >
        {headers.map((h) => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: GRIS, letterSpacing: "0.04em" }}>
            {h}
          </div>
        ))}
      </div>
      {children}
    </Card>
  );
}

export function Row({ columns, background, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        padding: "11px 14px",
        borderBottom: `1px solid ${BORD}`,
        background,
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}
