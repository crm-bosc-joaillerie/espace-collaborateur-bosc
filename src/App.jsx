import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Discussion from "./modules/Discussion";
import MessageClient from "./modules/MessageClient";
import PlanningAtelier from "./modules/PlanningAtelier";
import SuiviPochettes from "./modules/SuiviPochettes";
import Conges from "./modules/Conges";
import CommandesFournisseur from "./modules/CommandesFournisseur";
import Primes from "./modules/Primes";
import { collaborateurs, BORD, GRIS, CREME, ACCENT_DEFAULT } from "./theme";

const TITLES = {
  discussion: "Discussion",
  messages: "Message client",
  planning: "Planning atelier",
  pochettes: "Suivi pochettes clients",
  conges: "Congés",
  commandes: "Commandes fournisseurs",
  primes: "Primes",
};

const MODULES = {
  discussion: Discussion,
  messages: MessageClient,
  planning: PlanningAtelier,
  pochettes: SuiviPochettes,
  conges: Conges,
  commandes: CommandesFournisseur,
  primes: Primes,
};

export default function App() {
  const [activeModule, setActiveModule] = useState("discussion");
  const [collabIndex, setCollabIndex] = useState(0);

  const collab = collaborateurs[collabIndex % collaborateurs.length];
  const accent = ACCENT_DEFAULT;
  const ActiveModule = MODULES[activeModule];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif", display: "flex", width: "100%", minHeight: "100vh", background: CREME, color: "#1A1814" }}>
      <Sidebar
        collab={collab}
        onCycleCollab={() => setCollabIndex((i) => (i + 1) % collaborateurs.length)}
        activeModule={activeModule}
        onNavigate={setActiveModule}
        accent={accent}
      />

      <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 22px", background: "#fff", borderBottom: `1px solid ${BORD}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1814" }}>{TITLES[activeModule]}</div>
            <div style={{ fontSize: 10, color: GRIS }}>
              Maison Bosc Joaillerie · {collab.name} · {collab.role}
            </div>
          </div>
        </div>

        <div style={{ flexGrow: 1, padding: 22, overflowY: "auto" }}>
          <ActiveModule collab={collab} accent={accent} />
        </div>
      </div>
    </div>
  );
}
