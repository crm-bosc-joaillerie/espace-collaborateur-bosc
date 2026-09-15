import { NOIR, NOIR_HOVER } from "../theme";

const NAV_ITEMS = [
  {
    id: "discussion",
    label: "Discussion",
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
  },
  {
    id: "messages",
    label: "Message client",
    icon: (
      <>
        <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" />
        <polyline points="22,6 12,13 2,6" />
      </>
    ),
  },
  {
    id: "planning",
    label: "Planning atelier",
    icon: (
      <>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </>
    ),
  },
  {
    id: "pochettes",
    label: "Suivi pochettes",
    icon: (
      <>
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </>
    ),
  },
  {
    id: "conges",
    label: "Congés",
    icon: (
      <>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
      </>
    ),
  },
  {
    id: "commandes",
    label: "Commandes fournisseur",
    icon: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </>
    ),
  },
];

function NavIcon({ children }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}

export default function Sidebar({ collab, onCycleCollab, activeModule, onNavigate, accent }) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: NOIR, display: "flex", flexDirection: "column", padding: "20px 0 14px 0" }}>
      <div style={{ padding: "0 16px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.10)", marginBottom: 14 }}>
        <img src="/logo-bosc-blanc.png" alt="Bosc — Joaillerie d'émotions" style={{ width: "100%", maxWidth: 188, height: "auto", display: "block" }} />
      </div>

      <button
        onClick={onCycleCollab}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "0 12px 16px 12px",
          padding: 10,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 8,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 12, flexShrink: 0 }}>
          {collab.initials}
        </div>
        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{collab.name}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10.5, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{collab.role}</div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" style={{ flexShrink: 0 }}>
          <path d="M7 10l5 5 5-5" />
        </svg>
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px", flexGrow: 1, overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const active = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                background: active ? NOIR_HOVER : "transparent",
                color: active ? "#ffffff" : "#B7BCD4",
                fontSize: 12,
                fontWeight: active ? 700 : 600,
                textAlign: "left",
              }}
            >
              <NavIcon>{item.icon}</NavIcon>
              {item.label}
            </button>
          );
        })}

        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "8px 10px" }} />

        <button
          disabled
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 10px",
            borderRadius: 7,
            border: "none",
            cursor: "default",
            background: "transparent",
            color: "rgba(255,255,255,0.45)",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          <NavIcon>
            <circle cx="12" cy="8" r="6.2" />
            <polyline points="8.2 13.7 6.8 22.5 12 19.4 17.2 22.5 15.8 13.7" />
          </NavIcon>
          <span style={{ flexGrow: 1 }}>Primes</span>
          <span style={{ fontSize: 8.5, letterSpacing: "0.03em", color: "#8C90A6", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20, padding: "2px 6px", flexShrink: 0 }}>
            BIENTÔT
          </span>
        </button>
      </div>

      <div style={{ padding: "12px 16px 0 16px", marginTop: 6, borderTop: "1px solid rgba(255,255,255,0.10)", fontSize: 9.5, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
        Espace personnel de collaborateur
        <br />
        Maison Bosc Joaillerie
      </div>
    </div>
  );
}
