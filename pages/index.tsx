import { useMemo, useState, type JSX, type ReactNode } from "react";
import { Link } from "@void/react";
import {
  AccountsIcon,
  ChevronRightIcon,
  EventsIcon,
  ModuleIcon,
  SettingsIcon,
  type IconComponent,
} from "../src/icons.tsx";
import { extractCreateAccount } from "../src/cbor.ts";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import type { DecodedCommitEvent } from "../src/state/useEvents.ts";
import type { EventRecord, LanguageCode } from "../src/types.ts";

type EventTypeInfo = {
  readonly type: string;
  readonly en: string;
  readonly ja: string;
  readonly eo: string;
  readonly icon: IconComponent;
};

/** イベント種別ごとの表示名とアイコン. 色は CSS の `.timeline-item[data-event-type=...]` で付ける */
const EVENT_TYPES: ReadonlyArray<EventTypeInfo> = [
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
  {
    type: "change_profile",
    en: "Profile",
    ja: "プロファイル変更",
    eo: "Profilo",
    icon: SettingsIcon,
  },
];

function eventTypeInfo(type: string): EventTypeInfo {
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

function dateLocale(language: LanguageCode): string {
  return language === "ja" ? "ja-JP" : language === "eo" ? "eo" : "en-US";
}

/** イベントを日付 (ブラウザのタイムゾーン) ごとにまとめる. 並び順はサーバーの返した順のまま */
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

export default function EventsPage(): JSX.Element {
  const { language, events, connectionStatus, accountNames, decodedCommits } =
    useDefiny();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const commitsByHash = useMemo(
    () =>
      new Map<string, DecodedCommitEvent>(
        decodedCommits.map((c) => [c.event.eventHash, c]),
      ),
    [decodedCommits],
  );

  const countsByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of events) {
      counts.set(ev.eventType, (counts.get(ev.eventType) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  const filteredEvents = selectedFilter
    ? events.filter((ev) => ev.eventType === selectedFilter)
    : events;

  const filters: ReadonlyArray<{
    readonly type: string | null;
    readonly text: string;
    readonly count: number;
  }> = [
    {
      type: null,
      text: label(language, "All", "すべて", "Ĉiuj"),
      count: events.length,
    },
    ...EVENT_TYPES.map((t) => ({
      type: t.type,
      text: label(language, t.en, t.ja, t.eo),
      count: countsByType.get(t.type) ?? 0,
    })),
  ];

  const dayFormat = new Intl.DateTimeFormat(dateLocale(language), {
    dateStyle: "full",
  });

  return (
    <div className="event-list-view">
      <div className="view-header">
        <div className="view-heading">
          <h2 className="view-title">
            {label(
              language,
              "Events",
              "イベントタイムライン",
              "Eventa templinio",
            )}
          </h2>
          <p className="view-subtitle">
            {label(
              language,
              "Everything that happened on definy, newest first",
              "definy で起きた出来事を新しい順に表示します",
              "Ĉio okazinta en definy, plej novaj unue",
            )}
          </p>
        </div>
        <div
          className="filter-chips"
          role="group"
          aria-label={label(
            language,
            "Filter by type",
            "種類で絞り込み",
            "Filtri laŭ tipo",
          )}
        >
          {filters.map((f) => (
            <button
              key={f.type ?? "all"}
              type="button"
              className={`chip ${selectedFilter === f.type ? "active" : ""}`}
              aria-pressed={selectedFilter === f.type}
              onClick={() => {
                setSelectedFilter(f.type);
              }}
            >
              {f.text}
              <span className="chip-count">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {connectionStatus === "connecting" && events.length === 0 ? (
        <div className="empty-state">
          <span className="spinner" />
          <p>
            {label(
              language,
              "Loading events...",
              "イベントを読み込み中...",
              "Ŝargante eventojn...",
            )}
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state">
          <p>
            {label(
              language,
              "No events found",
              "イベントがありません",
              "Neniuj eventoj trovitaj",
            )}
          </p>
        </div>
      ) : (
        <ol className="timeline">
          {groupByDay(filteredEvents).map((group) => (
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
                    authorName={accountNames.get(ev.accountId)}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EventItem({
  event,
  language,
  commit,
  authorName,
}: {
  readonly event: EventRecord;
  readonly language: LanguageCode;
  readonly commit: DecodedCommitEvent | undefined;
  readonly authorName: string | undefined;
}): JSX.Element {
  const info = eventTypeInfo(event.eventType);
  const Icon = info.icon;
  const isInvalid = event.verification.status === "invalid";
  const time = new Date(event.timeMs);
  const author = authorName ?? event.accountId.slice(0, 8);

  return (
    <li
      className={`timeline-item ${isInvalid ? "timeline-item-invalid" : ""}`}
      data-event-type={event.eventType}
    >
      <span className="timeline-marker" aria-hidden="true">
        <Icon size={14} className="timeline-marker-icon" />
      </span>
      <Link
        href={`/event/${event.eventHash}`}
        className={`event-card ${isInvalid ? "event-card-invalid" : ""}`}
        data-event-type={event.eventType}
      >
        <div className="event-card-header">
          <span className="event-type">
            {label(language, info.en, info.ja, info.eo)}
          </span>
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
        <div className="event-card-meta">
          <span className="event-author" title={event.accountId}>
            <span className="event-author-avatar" aria-hidden="true">
              {author.slice(0, 1).toUpperCase()}
            </span>
            {author}
          </span>
          {commit !== undefined && (
            <span className="event-meta-item">
              {label(
                language,
                `${commit.commit.parts.length} parts`,
                `${commit.commit.parts.length} パーツ`,
                `${commit.commit.parts.length} partoj`,
              )}
            </span>
          )}
          <span className="event-hash" title={event.eventHash}>
            {event.eventHash.slice(0, 8)}
          </span>
          <ChevronRightIcon size={14} className="event-card-chevron" />
        </div>
      </Link>
    </li>
  );
}

/** イベントの中身の 1〜2 行の要約. 署名が不正なイベントの中身は信用しないので, 理由だけを出す */
function EventSummary({
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
      <strong className="event-summary-subject">
        {commit.commit.moduleName}
      </strong>
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
      <strong className="event-summary-subject">{name ?? "?"}</strong>
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
  if (event.eventType === "change_profile") {
    return (
      <p className="event-summary-text">
        {label(
          language,
          "Updated the profile",
          "プロファイルを変更",
          "Ŝanĝis la profilon",
        )}
      </p>
    );
  }
  return <p className="event-summary-text">{event.eventType}</p>;
}
