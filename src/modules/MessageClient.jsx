import { BORD, GRIS, OR_LIGHT, OR_DARK, ROUGE } from "../theme";
import { messagesClients } from "../theme";

export default function MessageClient() {
  return (
    <div>
      <div style={{ fontSize: 10, color: GRIS, marginBottom: 12 }}>
        Reproduit la fiche papier « MESSAGE » de l'accueil
      </div>

      <div style={{ background: "#fff", border: `1px solid ${BORD}`, borderRadius: 10, maxWidth: 720, overflow: "hidden" }}>
        {messagesClients.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "13px 16px",
              borderBottom: i < messagesClients.length - 1 ? `1px solid ${BORD}` : "none",
            }}
          >
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: OR_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: OR_DARK, flexShrink: 0 }}>
              {m.initials}
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1814" }}>{m.nom}</div>
                <div style={{ fontSize: 11, color: GRIS, flexShrink: 0 }}>{m.heure}</div>
              </div>
              <div style={{ fontSize: 12.5, color: "#3c3a33", marginTop: 2 }}>{m.texte}</div>
              {m.tags.length > 0 && (
                <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {m.tags.map((t) =>
                    t.type === "urgent" ? (
                      <span key={t.label} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 999, border: `1px solid ${ROUGE}`, color: ROUGE, fontWeight: 700 }}>
                        {t.label}
                      </span>
                    ) : (
                      <span key={t.label} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 999, border: `1px solid ${BORD}`, color: GRIS }}>
                        {t.label}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: "#A3A099", marginTop: 8 }}>Auto-effacé 30 jours après la date de saisie</div>
    </div>
  );
}
