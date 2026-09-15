import { OR_LIGHT, OR_DARK } from "../theme";
import { commandesFournisseur } from "../theme";
import { Tbl, Row, Badge } from "../components/ui";

const COLUMNS = "1.2fr 1.5fr 90px 140px 100px";

export default function CommandesFournisseur() {
  return (
    <div>
      <div style={{ padding: "8px 12px", background: OR_LIGHT, borderRadius: 8, fontSize: 11.5, color: OR_DARK, fontWeight: 600, marginBottom: 14, display: "inline-block" }}>
        3 commandes en cours
      </div>

      <Tbl columns={COLUMNS} headers={["FOURNISSEUR", "ARTICLE", "QTÉ", "ÉTAT", "DATE"]} minWidth={920}>
        {commandesFournisseur.map((c, i) => (
          <Row key={i} columns={COLUMNS}>
            <div style={{ fontSize: 12.5, color: "#1A1814" }}>{c.fournisseur}</div>
            <div style={{ fontSize: 12.5, color: "#1A1814" }}>{c.article}</div>
            <div style={{ fontSize: 12.5, color: "#1A1814" }}>{c.qte}</div>
            <div><Badge label={c.etat} bg={c.etatBg} color={c.etatColor} /></div>
            <div style={{ fontSize: 11.5, color: "#6B6760" }}>{c.date}</div>
          </Row>
        ))}
      </Tbl>
    </div>
  );
}
