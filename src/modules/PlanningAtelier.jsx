import { OR_LIGHT, OR_DARK } from "../theme";
import { planningAtelier } from "../theme";
import { Tbl, Row } from "../components/ui";

const COLUMNS = "90px 110px 1fr 90px 90px";

export default function PlanningAtelier() {
  return (
    <div>
      <div style={{ padding: "8px 12px", background: OR_LIGHT, borderRadius: 8, fontSize: 11.5, color: OR_DARK, fontWeight: 600, marginBottom: 14, display: "inline-block" }}>
        3 travaux · Total 6 h 30 min · 1 850 €
      </div>

      <Tbl columns={COLUMNS} headers={["SEMAINE", "TYPE", "CLIENT · DÉSIGNATION", "DURÉE", "FAÇON"]} minWidth={900}>
        {planningAtelier.map((r, i) => (
          <Row key={i} columns={COLUMNS} background={r.highlight ? "#D9F3E2" : undefined}>
            <div style={{ fontSize: 11.5, color: "#1A1814" }}>{r.semaine}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: r.typeColor }}>{r.type}</div>
            <div style={{ fontSize: 12.5, color: "#1A1814" }}>{r.designation}</div>
            <div style={{ fontSize: 11.5, color: "#3c3a33" }}>{r.duree}</div>
            <div style={{ fontSize: 11.5, color: "#3c3a33" }}>{r.facon}</div>
          </Row>
        ))}
      </Tbl>
    </div>
  );
}
