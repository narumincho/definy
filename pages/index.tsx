import { useMemo, useState, type JSX } from "react";
import {
  EVENT_TYPES,
  EventTimeline,
} from "../src/components/EventTimeline.tsx";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function EventsPage(): JSX.Element {
  const { language, events, connectionStatus } = useDefiny();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

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
        <EventTimeline events={filteredEvents} />
      )}
    </div>
  );
}
