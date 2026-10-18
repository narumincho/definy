import type { JSX } from "react";
import { Link } from "@void/react";
import { label, languageNativeName } from "../language.ts";
import { useDefiny } from "../state.tsx";

export function StatusBar(): JSX.Element {
  const { language, connectionStatus, workingChanges } = useDefiny();
  const changesCount = workingChanges.parts.size;

  const statusColor =
    connectionStatus === "connected"
      ? "var(--green)"
      : connectionStatus === "connecting"
        ? "var(--yellow)"
        : "var(--red)";

  const statusLabel =
    connectionStatus === "connected"
      ? label(language, "Connected", "接続中", "Konektita")
      : connectionStatus === "connecting"
        ? label(language, "Connecting...", "接続確認中...", "Konektante...")
        : label(language, "Offline", "オフライン", "Senreta");

  return (
    <footer className="status-bar">
      <div className="status-bar-section">
        <span
          className="status-dot"
          style={{ backgroundColor: statusColor }}
          title={statusLabel}
        />
        <span className="status-text">{statusLabel}</span>
      </div>

      {changesCount > 0 && (
        <Link href="/changes" className="status-bar-item status-changes-link">
          <span className="status-changes-dot">●</span>
          <span>
            {changesCount}{" "}
            {label(
              language,
              "uncommitted changes",
              "件の未コミット変更",
              "neenmetitaj ŝanĝoj",
            )}
          </span>
        </Link>
      )}

      <div className="status-bar-spacer" />

      <div className="status-bar-section">
        <span className="status-text">{languageNativeName(language)}</span>
      </div>
    </footer>
  );
}
