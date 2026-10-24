import type { JSX } from "react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function AccountsPage(): JSX.Element {
  const {
    language,
    events,
    accountNames,
    currentAccount,
    setAccountModalOpen,
  } = useDefiny();

  // Deduplicate accounts from events
  const accounts: ReadonlyArray<string> = Array.from(
    new Set(events.map((e) => e.accountId)),
  );

  return (
    <div className="accounts-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "Accounts", "アカウント一覧", "Kontoj")}
        </h2>
        <div className="view-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setAccountModalOpen(true);
            }}
          >
            {currentAccount
              ? label(
                  language,
                  "Manage Account",
                  "アカウント管理",
                  "Administri konton",
                )
              : label(
                  language,
                  "Create Account / Log In",
                  "新規作成 / ログイン",
                  "Krei konton / Ensaluti",
                )}
          </button>
        </div>
      </div>

      <div className="account-list">
        {accounts.length === 0 ? (
          <div className="empty-state">
            <p>
              {label(
                language,
                "No accounts found",
                "アカウントが見つかりません",
                "Neniuj kontoj trovitaj",
              )}
            </p>
          </div>
        ) : (
          accounts.map((acc) => {
            const count = events.filter((e) => e.accountId === acc).length;
            const isCurrent = currentAccount?.accountId === acc;
            const resolvedName =
              accountNames.get(acc) ??
              (isCurrent ? currentAccount.accountName : null);
            const initial = (resolvedName ?? acc).slice(0, 2).toUpperCase();

            return (
              <div key={acc} className="card account-card">
                <div className="account-avatar-large">{initial}</div>
                <div className="account-info">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {resolvedName ? (
                      <strong style={{ fontSize: "1rem" }}>
                        {resolvedName}
                      </strong>
                    ) : (
                      <strong className="account-id-text font-mono">
                        {acc}
                      </strong>
                    )}
                    {isCurrent && (
                      <span className="badge badge-success">
                        {label(language, "You", "あなた", "Vi")}
                      </span>
                    )}
                  </div>
                  {resolvedName && (
                    <span
                      className="font-mono text-muted"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {acc}
                    </span>
                  )}
                  <span className="account-events-count text-muted">
                    {count}{" "}
                    {label(language, "events", "件のイベント", "eventoj")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
