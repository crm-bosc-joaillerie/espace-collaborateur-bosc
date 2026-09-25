import React from "react";
import ReactDOM from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!reloading) {
        reloading = true;
        window.location.reload();
      }
    });
    const checkForUpdate = () => {
      if (!document.hidden) void registration.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("pageshow", checkForUpdate);
    checkForUpdate();
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>,
);
