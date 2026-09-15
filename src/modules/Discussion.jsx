import { BORD, GRIS, CREME, OR_LIGHT } from "../theme";
import { discussionMessages } from "../theme";

export default function Discussion({ collab, accent }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: GRIS, marginBottom: 12 }}>
        Salon # Général · connecté en tant que {collab.name}
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORD}`, borderRadius: 10, maxWidth: 720, overflow: "hidden" }}>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8, minHeight: 220 }}>
          {discussionMessages.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.moi ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: 10, color: GRIS, marginBottom: 2 }}>
                {m.moi ? (
                  <>{m.heure} · <strong style={{ color: "#7A5600" }}>Moi</strong></>
                ) : (
                  <><strong style={{ color: "#7A5600" }}>{m.auteur}</strong> · {m.heure}</>
                )}
              </div>
              <div
                style={{
                  maxWidth: 320,
                  padding: "8px 12px",
                  borderRadius: m.moi ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  background: m.moi ? OR_LIGHT : CREME,
                  border: `1px solid ${m.moi ? "#D4B483" : BORD}`,
                  fontSize: 13,
                  color: "#1A1814",
                }}
              >
                {m.texte}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${BORD}`, padding: "11px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flexGrow: 1, background: CREME, border: `1px solid ${BORD}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#A3A099" }}>
            Votre message… (Entrée pour envoyer)
          </div>
          <div style={{ background: accent, borderRadius: 8, padding: "9px 16px", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            Envoyer
          </div>
        </div>
      </div>
    </div>
  );
}
