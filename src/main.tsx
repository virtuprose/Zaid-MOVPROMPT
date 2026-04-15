import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Hide splash screen once React mounts
const splash = document.getElementById("splash");
if (splash) {
  splash.style.transition = "opacity 0.4s ease-out";
  requestAnimationFrame(() => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 400);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
