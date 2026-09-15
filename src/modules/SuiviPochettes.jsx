import { OR_LIGHT, OR_DARK } from "../theme";
import { pochettes } from "../theme";
import { Tbl, Row, Badge } from "../components/ui";

const COLUMNS = "90px 1.2fr 1.2fr 110px 100px";

export default function SuiviPochettes() {
  return (
    <div>
      <div style={{ padding: "8px 12px", background: OR_LIGHT, borderRadius: 8, fontSize: 11.5, color: OR_DARK, fontWeight: 600, marginBottom: 14, display: "inline-block" }}>
        4 pochettes suivies · Total 650 €
      </div>

      <Tbl columns={COLUMNS} headers={["POCHETTE", "CLIENT", "BIJOU", "STATUT", "FAÇON"]} minWidth={920}>
        {pochettes.map((p) => (
          <Row key={p.numero} columns={COLUMNS}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1814" }}>{p.numero}</div>
            <div style={{ fontSize: 12.5, color: "#1A1814" }}>{p.client}</div>
            <div style={{ fontSize: 12.5, color: "#1A1814" }}>{p.bijou}</div>
            <div><Badge label={p.statut} bg={p.statutBg} color={p.statutColor} /></div>
            <div style={{ fontSize: 12, color: "#3c3a33" }}>{p.facon}</div>
          </Row>
        ))}
      </Tbl>
    </div>
  );
}
