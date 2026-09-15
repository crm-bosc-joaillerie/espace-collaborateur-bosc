import { BORD, GRIS, OR_LIGHT } from "../theme";

export default function Primes() {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORD}`, borderRadius: 10, maxWidth: 540, padding: "38px 36px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: OR_LIGHT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto", fontSize: 22 }}>
        🏆
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1814", marginBottom: 8 }}>Bientôt disponible</div>
      <div style={{ fontSize: 13, color: GRIS, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
        Ce module se connectera automatiquement au classeur « Suivi pochettes clients » pour calculer les primes en
        fonction des interventions terminées et facturées.
      </div>
      <div style={{ display: "inline-block", marginTop: 20, background: "#F1EFE8", color: "#A19C90", fontSize: 12.5, fontWeight: 700, padding: "9px 18px", borderRadius: 8 }}>
        Bientôt disponible
      </div>
    </div>
  );
}
