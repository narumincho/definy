import { useMemo, type JSX } from "react";
import { useParams } from "@void/react";
import { Link } from "../../src/components/Link.tsx";
import { ModuleIcon } from "../../src/icons.tsx";
import {
  EventTimeline,
  accountDisplayName,
  dateLocale,
} from "../../src/components/EventTimeline.tsx";
import { CopyButton } from "../../src/components/CopyButton.tsx";
import { label } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { usePageTitle } from "../../src/page_title.ts";

/** アカウントのページ. そのアカウントのイベントとコミットしたモジュールを出す */
export default function AccountDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const accountId = id ?? "";
  const {
    language,
    events,
    accountNames,
    currentAccount,
    decodedCommits,
    connectionStatus,
  } = useDefiny();

  const accountEvents = useMemo(
    () => events.filter((e) => e.accountId === accountId),
    [events, accountId],
  );

  /** このアカウントがコミットしたモジュール (最後にコミットした順) */
  const committedModules = useMemo(() => {
    const latest = new Map<string, number>();
    for (const { event, commit } of decodedCommits) {
      if (event.accountId !== accountId) continue;
      const prev = latest.get(commit.moduleName);
      if (prev === undefined || prev < event.timeMs) {
        latest.set(commit.moduleName, event.timeMs);
      }
    }
    return [...latest].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [decodedCommits, accountId]);

  const isCurrent = currentAccount?.accountId === accountId;
  const name =
    accountNames.get(accountId) ??
    (isCurrent ? currentAccount.accountName : undefined);
  const displayName = name ?? accountDisplayName(accountId, accountNames);
  usePageTitle(displayName);

  const createdEvent = accountEvents.find(
    (e) => e.eventType === "create_account",
  );
  const commitCount = accountEvents.filter(
    (e) => e.eventType === "module_commit",
  ).length;

  return (
    <div className="account-detail-view">
      <div className="breadcrumb">
        <Link href="/accounts" className="breadcrumb-link">
          {label(language, "Accounts", "アカウント", "Kontoj")}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{displayName}</span>
      </div>

      <header className="card account-detail-header">
        <div className="account-avatar-large account-avatar-xl">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="account-detail-info">
          <h2 className="account-detail-name">
            {displayName}
            {isCurrent && (
              <span className="badge badge-success">
                {label(language, "You", "あなた", "Vi")}
              </span>
            )}
          </h2>
          <span className="meta-hash">
            <code className="font-mono text-muted">{accountId}</code>
            <CopyButton text={accountId} language={language} />
          </span>
          {createdEvent !== undefined && (
            <Link
              href={`/event/${createdEvent.eventHash}`}
              className="account-detail-joined"
            >
              {label(language, "Joined", "作成日", "Aliĝis")}{" "}
              {new Date(createdEvent.timeMs).toLocaleDateString(
                dateLocale(language),
                { dateStyle: "medium" },
              )}
            </Link>
          )}
        </div>
        <dl className="account-detail-stats">
          <div>
            <dt>{label(language, "Events", "イベント", "Eventoj")}</dt>
            <dd>{accountEvents.length}</dd>
          </div>
          <div>
            <dt>{label(language, "Commits", "コミット", "Enmetoj")}</dt>
            <dd>{commitCount}</dd>
          </div>
          <div>
            <dt>{label(language, "Modules", "モジュール", "Moduloj")}</dt>
            <dd>{committedModules.length}</dd>
          </div>
        </dl>
      </header>

      {committedModules.length > 0 && (
        <section className="account-detail-section">
          <h3 className="event-detail-section-title">
            {label(
              language,
              "Committed modules",
              "コミットしたモジュール",
              "Enmetitaj moduloj",
            )}
          </h3>
          <ul className="account-module-list">
            {committedModules.map((moduleName) => (
              <li key={moduleName}>
                <Link
                  href={`/module/${moduleName}`}
                  className="account-module-chip"
                >
                  <ModuleIcon size={14} className="account-module-icon" />
                  {moduleName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="account-detail-section">
        <h3 className="event-detail-section-title">
          {label(language, "Activity", "アクティビティ", "Aktiveco")}
        </h3>
        {accountEvents.length === 0 ? (
          <div className="empty-state">
            {connectionStatus === "connecting" ? (
              <span className="spinner" />
            ) : (
              <p>
                {label(
                  language,
                  "No events found",
                  "イベントがありません",
                  "Neniuj eventoj trovitaj",
                )}
              </p>
            )}
          </div>
        ) : (
          <EventTimeline events={accountEvents} />
        )}
      </section>
    </div>
  );
}
