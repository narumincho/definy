import type { JSX } from "react";
import { Link } from "../src/components/Link.tsx";
import { AccountLink } from "../src/components/EventTimeline.tsx";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function HistoryPage(): JSX.Element {
  const { language, events, decodedCommits } = useDefiny();

  const commits = events.filter((e) => e.eventType === "module_commit");
  const decodedByHash = new Map(
    decodedCommits.map((c) => [c.event.eventHash, c.commit]),
  );

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
          commits.map((commit) => {
            const decoded = decodedByHash.get(commit.eventHash);
            return (
              <div
                key={commit.eventHash}
                className={`card commit-card ${commit.verification.status === "invalid" ? "event-card-invalid" : ""}`}
              >
                <div className="commit-header">
                  <Link
                    href={`/event/${commit.eventHash}`}
                    className="commit-hash"
                    title={commit.eventHash}
                  >
                    {commit.eventHash.slice(0, 12)}
                  </Link>
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
                {decoded !== undefined && (
                  <div className="commit-body">
                    <Link
                      href={`/module/${decoded.moduleName}`}
                      className="commit-module"
                    >
                      {decoded.moduleName}
                    </Link>
                    {decoded.message.length > 0 && (
                      <span className="commit-message">{decoded.message}</span>
                    )}
                  </div>
                )}
                <div className="commit-footer">
                  <AccountLink accountId={commit.accountId} />
                  {decoded !== undefined && (
                    <span className="text-muted commit-parts-count">
                      {label(
                        language,
                        `${decoded.parts.length} parts`,
                        `${decoded.parts.length} パーツ`,
                        `${decoded.parts.length} partoj`,
                      )}
                    </span>
                  )}
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
            );
          })
        )}
      </div>
    </div>
  );
}
