import { useMemo, type JSX, type ReactNode } from "react";
import { Link } from "./Link.tsx";
import {
  AccountsIcon,
  ChevronRightIcon,
  EventsIcon,
  ModuleIcon,
  type IconComponent,
} from "../icons.tsx";
import { extractCreateAccount } from "../cbor.ts";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import type { DecodedCommitEvent } from "../state/useEvents.ts";
import type { EventRecord, LanguageCode } from "../types.ts";

export type EventTypeInfo = {
  readonly type: string;
  readonly en: string;
  readonly ja: string;
  readonly eo: string;
  readonly icon: IconComponent;
};

/** イベント種別ごとの表示名とアイコン. 色は CSS の `[data-event-type=...]` で付ける */
export const EVENT_TYPES: ReadonlyArray<EventTypeInfo> = [
  {
    type: "module_commit",
    en: "Commit",
    ja: "コミット",
    eo: "Enmeto",
    icon: ModuleIcon,
  },
  {
    type: "create_account",
    en: "New account",
    ja: "アカウント作成",
    eo: "Nova konto",
    icon: AccountsIcon,
  },
];

export function eventTypeInfo(type: string): EventTypeInfo {
  return (
    EVENT_TYPES.find((t) => t.type === type) ?? {
      type,
      en: type,
      ja: type,
      eo: type,
      icon: EventsIcon,
    }
  );
}

export function dateLocale(language: LanguageCode): string {
  return language === "ja" ? "ja-JP" : language === "eo" ? "eo" : "en-US";
}

/** 名前が分からないアカウントは ID の先頭で表す */
export function accountDisplayName(
  accountId: string,
  accountNames: ReadonlyMap<string, string>,
): string {
  return accountNames.get(accountId) ?? accountId.slice(0, 8);
}

/** アカウントのページへのリンク (頭文字のアバター付き) */
export function AccountLink({
  accountId,
  className = "",
}: {
  readonly accountId: string;
  readonly className?: string;
}): JSX.Element {
  const { accountNames } = useDefiny();
  const name = accountDisplayName(accountId, accountNames);
  return (
    <Link
      href={`/account/${accountId}`}
      className={`account-link ${className}`}
      title={accountId}
    >
      <span className="account-link-avatar" aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="account-link-name">{name}</span>
    </Link>
  );
}

/** イベントを日付 (ブラウザのタイムゾーン) ごとにまとめる. 並び順は渡された順のまま */
function groupByDay(
  events: ReadonlyArray<EventRecord>,
): ReadonlyArray<{ readonly key: string; readonly events: EventRecord[] }> {
  const groups: Array<{
    readonly key: string;
    readonly events: EventRecord[];
  }> = [];
  for (const ev of events) {
    const date = new Date(ev.timeMs);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const last = groups.at(-1);
    if (last?.key === key) {
      last.events.push(ev);
    } else {
      groups.push({ key, events: [ev] });
    }
  }
  return groups;
}

/** 日付ごとにまとめたイベントのタイムライン. トップページとアカウントのページで使う */
export function EventTimeline({
  events,
}: {
  readonly events: ReadonlyArray<EventRecord>;
}): JSX.Element {
  const { language, decodedCommits } = useDefiny();

  const commitsByHash = useMemo(
    () =>
      new Map<string, DecodedCommitEvent>(
        decodedCommits.map((c) => [c.event.eventHash, c]),
      ),
    [decodedCommits],
  );

  const dayFormat = new Intl.DateTimeFormat(dateLocale(language), {
    dateStyle: "full",
  });

  return (
    <ol className="timeline">
      {groupByDay(events).map((group) => (
        <li key={group.key} className="timeline-day">
          <h3 className="timeline-day-label">
            {dayFormat.format(group.events[0]?.timeMs)}
          </h3>
          <ol className="timeline-items">
            {group.events.map((ev) => (
              <EventItem
                key={ev.eventHash}
                event={ev}
                language={language}
                commit={commitsByHash.get(ev.eventHash)}
              />
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

/** カードに並べるパーツの数. それより多い分は「他 N 個」にまとめる */
const MAX_PART_CHIPS = 6;

/**
 * タイムラインの 1 件. カード全体はイベント詳細へのリンク (`.event-card-link` の ::after で広げる) で,
 * その上にアカウント・モジュール・パーツのリンクを重ねる. `<a>` の入れ子は HTML で許されないため
 */
function EventItem({
  event,
  language,
  commit,
}: {
  readonly event: EventRecord;
  readonly language: LanguageCode;
  readonly commit: DecodedCommitEvent | undefined;
}): JSX.Element {
  const info = eventTypeInfo(event.eventType);
  const Icon = info.icon;
  const isInvalid = event.verification.status === "invalid";
  const time = new Date(event.timeMs);
  const parts = commit?.commit.parts ?? [];

  return (
    <li
      className={`timeline-item ${isInvalid ? "timeline-item-invalid" : ""}`}
      data-event-type={event.eventType}
    >
      <span className="timeline-marker" aria-hidden="true">
        <Icon size={14} className="timeline-marker-icon" />
      </span>
      <article
        className={`event-card ${isInvalid ? "event-card-invalid" : ""}`}
        data-event-type={event.eventType}
      >
        <div className="event-card-header">
          <Link
            href={`/event/${event.eventHash}`}
            className="event-card-link event-type"
          >
            {label(language, info.en, info.ja, info.eo)}
          </Link>
          {isInvalid && (
            <span
              className="badge badge-invalid-signature"
              title={event.verification.reason}
            >
              {label(
                language,
                "Invalid signature",
                "署名が不正",
                "Nevalida subskribo",
              )}
            </span>
          )}
          <time
            className="event-time"
            dateTime={event.createdAtRfc3339}
            title={time.toLocaleString(dateLocale(language))}
          >
            {time.toLocaleTimeString(dateLocale(language), {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
        <div className="event-card-summary">
          <EventSummary event={event} language={language} commit={commit} />
        </div>
        {parts.length > 0 && commit !== undefined && (
          <ul className="event-part-chips">
            {parts.slice(0, MAX_PART_CHIPS).map((part) => (
              <li key={part.name}>
                <Link
                  href={`/part/${commit.commit.moduleName}.${part.name}`}
                  className="event-part-chip"
                >
                  {part.name}
                </Link>
              </li>
            ))}
            {parts.length > MAX_PART_CHIPS && (
              <li className="event-part-more">
                {label(
                  language,
                  `+${parts.length - MAX_PART_CHIPS} more`,
                  `他 ${parts.length - MAX_PART_CHIPS} 個`,
                  `+${parts.length - MAX_PART_CHIPS} pliaj`,
                )}
              </li>
            )}
          </ul>
        )}
        <div className="event-card-meta">
          <AccountLink accountId={event.accountId} />
          {commit !== undefined && (
            <span className="event-meta-item">
              {label(
                language,
                `${parts.length} parts`,
                `${parts.length} パーツ`,
                `${parts.length} partoj`,
              )}
            </span>
          )}
          <span className="event-hash" title={event.eventHash}>
            {event.eventHash.slice(0, 8)}
          </span>
          <ChevronRightIcon size={14} className="event-card-chevron" />
        </div>
      </article>
    </li>
  );
}

/**
 * イベントの中身の 1〜2 行の要約. モジュール名・アカウント名は各ページへのリンクにする.
 * 署名が不正なイベントの中身は信用しないので, 理由だけを出す
 */
export function EventSummary({
  event,
  language,
  commit,
}: {
  readonly event: EventRecord;
  readonly language: LanguageCode;
  readonly commit: DecodedCommitEvent | undefined;
}): ReactNode {
  if (event.verification.status === "invalid") {
    return (
      <p className="event-summary-text event-summary-invalid">
        {label(
          language,
          "The contents are hidden because the signature could not be verified",
          "署名を検証できなかったため、内容は表示しません",
          "La enhavo estas kaŝita, ĉar la subskribo ne estis kontrolebla",
        )}
        <span className="event-summary-reason">
          {event.verification.reason}
        </span>
      </p>
    );
  }
  if (commit !== undefined) {
    const moduleName = (
      <Link
        href={`/module/${commit.commit.moduleName}`}
        className="event-summary-subject event-summary-link"
      >
        {commit.commit.moduleName}
      </Link>
    );
    return (
      <>
        <p className="event-summary-text">
          {language === "ja" ? (
            <>{moduleName} モジュール</>
          ) : language === "eo" ? (
            <>Modulo {moduleName}</>
          ) : (
            <>Module {moduleName}</>
          )}
        </p>
        {commit.commit.message.length > 0 && (
          <p className="event-commit-message">{commit.commit.message}</p>
        )}
      </>
    );
  }
  if (event.eventType === "create_account") {
    const name = extractCreateAccount(event.signedEventBytes)?.accountName;
    const subject = (
      <Link
        href={`/account/${event.accountId}`}
        className="event-summary-subject event-summary-link"
      >
        {name ?? "?"}
      </Link>
    );
    return (
      <p className="event-summary-text">
        {language === "ja" ? (
          <>アカウント {subject} を作成</>
        ) : language === "eo" ? (
          <>Kreis la konton {subject}</>
        ) : (
          <>Created account {subject}</>
        )}
      </p>
    );
  }
  return <p className="event-summary-text">{event.eventType}</p>;
}
