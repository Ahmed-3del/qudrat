import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Static build: all content ships with the bundle and progress is kept in localStorage.
createRoot(document.getElementById("root")!).render(<App />);
