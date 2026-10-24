import type { JSX } from "react";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

/**
 * タイトルバーに出すサーバーとの接続状態.
 * 接続済みのときは点だけを出し, 確認中・オフラインのときだけ文字でも知らせる
 */
export function ConnectionStatus(): JSX.Element {
  const { language, connectionStatus } = useDefiny();

  const statusLabel =
    connectionStatus === "connected"
      ? label(language, "Connected", "接続済み", "Konektita")
      : connectionStatus === "connecting"
        ? label(language, "Connecting...", "接続確認中...", "Konektante...")
        : label(language, "Offline", "オフライン", "Senreta");

  return (
    <div
      className={`connection-status connection-status-${connectionStatus}`}
      role="status"
      title={statusLabel}
      aria-label={statusLabel}
    >
      <span className="connection-status-dot" aria-hidden="true" />
      {connectionStatus !== "connected" && (
        <span className="connection-status-text" aria-hidden="true">
          {statusLabel}
        </span>
      )}
    </div>
  );
}
