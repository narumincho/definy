import type { JSX } from "react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function AccountsPage(): JSX.Element {
  const { language, events } = useDefiny();

  // Deduplicate accounts from events
  const accounts = Array.from(new Set(events.map((e) => e.accountId)));

  return (
    <div className="accounts-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "Accounts", "アカウント一覧", "Kontoj")}
        </h2>
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
            return (
              <div key={acc} className="card account-card">
                <div className="account-avatar-large">
                  {acc.slice(0, 2).toUpperCase()}
                </div>
                <div className="account-info">
                  <strong className="account-id-text font-mono">{acc}</strong>
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
