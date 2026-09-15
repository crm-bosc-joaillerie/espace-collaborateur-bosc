import { BORD, GRIS, CREME } from "../theme";
import { congesHistorique } from "../theme";
import { Card, KPI } from "../components/ui";

export default function Conges({ accent }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, maxWidth: 720, marginBottom: 20 }}>
        <KPI label="SOLDE RESTANT" value="14" suffix="/ 25 j." accent={accent} />
        <KPI label="PROCHAIN CONGÉ" value="21–25 septembre" />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={{ fontSize: 11, color: GRIS, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
          Nombre de jours
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center", maxWidth: 320 }}>
          <div style={{ flexGrow: 1, padding: "11px 12px", borderRadius: 8, border: `1px solid ${BORD}`, fontSize: 13, color: "#A3A099", background: CREME }}>
            ex : 2
          </div>
          <div style={{ background: accent, color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "11px 18px", borderRadius: 8, whiteSpace: "nowrap" }}>
            ＋ Ajouter
          </div>
        </div>
      </div>

      <div style={{ fontSize: 10.5, fontWeight: 700, color: GRIS, letterSpacing: "0.04em", marginBottom: 8 }}>
        CONGÉS ENREGISTRÉS
      </div>
      <Card style={{ maxWidth: 600 }}>
        {congesHistorique.map((c, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: i < congesHistorique.length - 1 ? `1px solid ${BORD}` : "none",
            }}
          >
            <div style={{ fontSize: 12.5, color: "#1A1814" }}>{c.periode}</div>
            <div style={{ fontSize: 12, color: GRIS }}>{c.heures}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
