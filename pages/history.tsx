import type { JSX } from "react";
import { Link } from "@void/react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import { usePageTitle } from "../src/page_title.ts";

export default function HistoryPage(): JSX.Element {
  const { language, events } = useDefiny();
  usePageTitle(label(language, "Commit History", "コミット履歴", "Historio"));

  const commits = events.filter((e) => e.eventType === "module_commit");

  return (
    <div className="history-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "Commit History", "コミット履歴", "Historio")}
        </h2>
      </div>

      <div className="commit-list">
        {commits.length === 0 ? (
          <div className="empty-state">
            <p>
              {label(
                language,
                "No commits found",
                "コミットが見つかりません",
                "Neniuj enmetoj trovitaj",
              )}
            </p>
          </div>
        ) : (
          commits.map((commit) => (
            <div
              key={commit.eventHash}
              className={`card commit-card ${commit.verification.status === "invalid" ? "event-card-invalid" : ""}`}
            >
              <div className="commit-header">
                <span className="commit-hash" title={commit.eventHash}>
                  {commit.eventHash.slice(0, 12)}
                </span>
                {commit.verification.status === "invalid" && (
                  <span
                    className="badge badge-invalid-signature"
                    title={commit.verification.reason}
                  >
                    {label(
                      language,
                      "Invalid signature",
                      "署名が不正",
                      "Nevalida subskribo",
                    )}
                  </span>
                )}
                <span className="commit-time">
                  {new Date(commit.timeMs).toLocaleString()}
                </span>
              </div>
              <div className="commit-footer">
                <Link
                  href={`/event/${commit.eventHash}`}
                  className="btn btn-ghost btn-xs"
                >
                  {label(
                    language,
                    "Inspect Event →",
                    "イベント詳細 →",
                    "Inspekti →",
                  )}
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
