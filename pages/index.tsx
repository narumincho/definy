import { useState, type JSX } from "react";
import { Link } from "@void/react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

const EVENT_FILTERS: ReadonlyArray<{
  readonly type: string | null;
  readonly en: string;
  readonly ja: string;
  readonly eo: string;
}> = [
  { type: null, en: "All", ja: "すべて", eo: "Ĉiuj" },
  {
    type: "create_account",
    en: "Accounts",
    ja: "アカウント作成",
    eo: "Kontoj",
  },
  {
    type: "module_commit",
    en: "Commits",
    ja: "モジュールコミット",
    eo: "Enmetoj",
  },
  {
    type: "change_profile",
    en: "Profile",
    ja: "プロファイル変更",
    eo: "Profilo",
  },
];

export default function EventsPage(): JSX.Element {
  const { language, events, connectionStatus } = useDefiny();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const filteredEvents = selectedFilter
    ? events.filter((ev) => ev.eventType === selectedFilter)
    : events;

  return (
    <div className="event-list-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(
            language,
            "Events",
            "イベントタイムライン",
            "Eventa templinio",
          )}
        </h2>
        <div className="filter-chips">
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.type ?? "all"}
              type="button"
              className={`chip ${selectedFilter === f.type ? "active" : ""}`}
              onClick={() => {
                setSelectedFilter(f.type);
              }}
            >
              {label(language, f.en, f.ja, f.eo)}
            </button>
          ))}
        </div>
      </div>

      <div className="event-list-container">
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
          filteredEvents.map((ev) => (
            <div
              key={ev.eventHash}
              className={`card event-card ${ev.verification.status === "invalid" ? "event-card-invalid" : ""}`}
            >
              <div className="event-card-header">
                <span className={`badge badge-${ev.eventType}`}>
                  {ev.eventType}
                </span>
                {ev.verification.status === "invalid" && (
                  <span
                    className="badge badge-invalid-signature"
                    title={ev.verification.reason}
                  >
                    {label(
                      language,
                      "Invalid signature",
                      "署名が不正",
                      "Nevalida subskribo",
                    )}
                  </span>
                )}
                <span className="event-time" title={ev.createdAtRfc3339}>
                  {new Date(ev.timeMs).toLocaleString()}
                </span>
              </div>
              <div className="event-card-body">
                <span className="event-hash" title={ev.eventHash}>
                  {ev.eventHash.slice(0, 16)}...
                </span>
                <span className="event-author">
                  {label(language, "by", "作成者:", "de")}{" "}
                  {ev.accountId.slice(0, 12)}
                </span>
              </div>
              <div className="event-card-footer">
                <Link
                  href={`/event/${ev.eventHash}`}
                  className="btn btn-ghost btn-xs"
                >
                  {label(language, "Details →", "詳細 →", "Detaloj →")}
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
