import type { JSX } from "react";
import { useParams } from "@void/react";
import { Link } from "../../src/components/Link.tsx";
import {
  AccountLink,
  dateLocale,
} from "../../src/components/EventTimeline.tsx";
import { label, localizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { usePageTitle } from "../../src/page_title.ts";

export default function ModuleDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { language, modules, parts, decodedCommits } = useDefiny();

  const mod = modules.find((m) => m.moduleId === id) ?? {
    moduleId: id ?? "unknown",
    name: id ?? "unknown",
    description: [],
    latestEventHash: "",
    message: "",
    parts: [],
    updatedAtMs: Date.now(),
  };

  usePageTitle(mod.name);

  const moduleParts = parts.filter((p) => p.moduleId === id);
  /** このモジュールのコミット (新しい順) */
  const moduleCommits = decodedCommits
    .filter((c) => c.commit.moduleName === id)
    .toSorted((a, b) => b.event.timeMs - a.event.timeMs);

  return (
    <div className="module-detail-view">
      <div className="breadcrumb">
        <Link href="/modules" className="breadcrumb-link">
          {label(language, "Modules", "モジュール", "Moduloj")}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{mod.name}</span>
      </div>
      <div className="card module-header">
        <h2 className="module-title">{mod.name}</h2>
        {mod.description.length > 0 && (
          <p className="module-desc">
            {localizedText(mod.description, language)}
          </p>
        )}
      </div>

      {moduleCommits.length > 0 && (
        <div className="module-parts-section">
          <h3>{label(language, "Commits", "コミット履歴", "Enmetoj")}</h3>
          <ol className="module-commit-list">
            {moduleCommits.map(({ event, commit }) => (
              <li key={event.eventHash} className="module-commit">
                <Link
                  href={`/event/${event.eventHash}`}
                  className="module-commit-message"
                >
                  {commit.message.length > 0
                    ? commit.message
                    : label(
                        language,
                        "(no message)",
                        "(メッセージなし)",
                        "(sen mesaĝo)",
                      )}
                </Link>
                <span className="module-commit-meta">
                  <AccountLink accountId={event.accountId} />
                  <time dateTime={event.createdAtRfc3339}>
                    {new Date(event.timeMs).toLocaleString(
                      dateLocale(language),
                      { dateStyle: "medium", timeStyle: "short" },
                    )}
                  </time>
                  <Link
                    href={`/event/${event.eventHash}`}
                    className="event-hash"
                  >
                    {event.eventHash.slice(0, 8)}
                  </Link>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="module-parts-section">
        <h3>
          {label(
            language,
            "Parts in this module",
            "このモジュールのパーツ",
            "Partoj en ĉi tiu modulo",
          )}
        </h3>
        <div className="part-grid">
          {moduleParts.length === 0 ? (
            <p className="text-muted">
              {label(
                language,
                "No parts in this module",
                "パーツがありません",
                "Neniuj partoj",
              )}
            </p>
          ) : (
            moduleParts.map((part) => (
              <Link
                key={part.partId}
                href={`/part/${part.partId}`}
                className="card part-card"
              >
                <strong>{part.name}</strong>
                {part.description.length > 0 && (
                  <p>{localizedText(part.description, language)}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
