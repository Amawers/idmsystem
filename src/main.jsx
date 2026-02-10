/**
 * Application entry point.
 *
 * Responsibilities:
 * - Load global styles.
 * - Bootstrap the React root and render the app shell.
 *
 * Note: React `StrictMode` intentionally re-invokes certain lifecycle paths in
 * development to surface unsafe side effects; this does not affect production.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
