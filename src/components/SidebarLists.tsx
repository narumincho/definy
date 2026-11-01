import { useMemo, type JSX } from "react";
import { useRouter } from "@void/react";
import { Link } from "./Link.tsx";
import { dateLocale, eventTypeInfo } from "./EventTimeline.tsx";
import { extractCreateAccount } from "../decoded_event.ts";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

/**
 * サイドバーの「イベント」の欄: イベントの一覧 (新しい順). 押すとイベント詳細を開く (docs/ui.md「ワークベンチ」)
 */
export function EventList({
  onNavigate,
}: {
  readonly onNavigate: () => void;
}): JSX.Element {
  const { language, events, decodedCommits, accountNames } = useDefiny();
  const currentPath = useRouter().path;
  const commitByHash = useMemo(
    () => new Map(decodedCommits.map((c) => [c.event.eventHash, c.commit])),
    [decodedCommits],
  );

  if (events.length === 0) {
    return (
      <div className="sidebar-empty">
        {label(
          language,
          "No events yet",
          "イベントがまだありません",
          "Ankoraŭ neniuj eventoj",
        )}
      </div>
    );
  }
  return (
    <div className="sidebar-list">
      {events.map((event) => {
        const info = eventTypeInfo(event.eventType);
        const Icon = info.icon;
        const commit = commitByHash.get(event.eventHash);
        const invalid = event.verification.status === "invalid";
        const title = invalid
          ? label(
              language,
              "Invalid signature",
              "署名が不正",
              "Nevalida subskribo",
            )
          : commit !== undefined
            ? commit.projectName
            : event.eventType === "create_account"
              ? (extractCreateAccount(event.signedEventBytes)?.accountName ??
                "?")
              : label(language, info.en, info.ja, info.eo);
        const detail =
          commit !== undefined
            ? commit.message
            : label(language, info.en, info.ja, info.eo);
        const href = `/event/${event.eventHash}`;
        return (
          <div
            key={event.eventHash}
            className="sidebar-tree-row"
            data-level="list"
          >
            <Link
              href={href}
              className="sidebar-tree-node sidebar-event-node"
              data-event-type={event.eventType}
              data-invalid={invalid ? "" : undefined}
              aria-current={currentPath === href ? "page" : undefined}
              title={`${title} — ${detail} (${accountNames.get(event.accountId) ?? event.accountId.slice(0, 8)})`}
              onClick={onNavigate}
            >
              <Icon
                size={15}
                className="sidebar-node-icon sidebar-event-icon"
              />
              <span className="sidebar-node-label">{title}</span>
              {detail !== "" && (
                <span className="sidebar-node-detail">{detail}</span>
              )}
              <time className="sidebar-count" dateTime={event.createdAtRfc3339}>
                {new Date(event.timeMs).toLocaleDateString(
                  dateLocale(language),
                  { month: "short", day: "numeric" },
                )}
              </time>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

/**
 * サイドバーの「アカウント一覧」の欄: イベントを出したアカウント. 押すとアカウントのページを開く
 */
export function AccountList({
  onNavigate,
}: {
  readonly onNavigate: () => void;
}): JSX.Element {
  const { language, events, accountNames, currentAccount } = useDefiny();
  const currentPath = useRouter().path;
  const accounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      counts.set(event.accountId, (counts.get(event.accountId) ?? 0) + 1);
    }
    return [...counts];
  }, [events]);

  if (accounts.length === 0) {
    return (
      <div className="sidebar-empty">
        {label(
          language,
          "No accounts yet",
          "アカウントがまだありません",
          "Ankoraŭ neniuj kontoj",
        )}
      </div>
    );
  }
  return (
    <div className="sidebar-list">
      {accounts.map(([accountId, count]) => {
        const isCurrent = currentAccount?.accountId === accountId;
        const name =
          accountNames.get(accountId) ??
          (isCurrent ? currentAccount.accountName : null);
        const href = `/account/${accountId}`;
        return (
          <div key={accountId} className="sidebar-tree-row" data-level="list">
            <Link
              href={href}
              className="sidebar-tree-node sidebar-account-node"
              aria-current={currentPath === href ? "page" : undefined}
              title={accountId}
              onClick={onNavigate}
            >
              <span className="sidebar-account-avatar" aria-hidden="true">
                {(name ?? accountId).slice(0, 1).toUpperCase()}
              </span>
              <span
                className={`sidebar-node-label ${name === null ? "font-mono" : ""}`}
              >
                {name ?? accountId.slice(0, 12)}
              </span>
              {isCurrent && (
                <span className="sidebar-branch">
                  {label(language, "You", "あなた", "Vi")}
                </span>
              )}
              <span
                className="sidebar-count"
                title={label(language, "Events", "イベント数", "Eventoj")}
              >
                {count}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
