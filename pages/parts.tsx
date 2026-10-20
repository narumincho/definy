import { useState, type JSX } from "react";
import { Link } from "@void/react";
import { PlayIcon } from "../src/icons.tsx";
import { label, localizedText } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function PartsPage(): JSX.Element {
  const { language, parts, workingChanges } = useDefiny();
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filteredParts = q
    ? parts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.moduleName.toLowerCase().includes(q) ||
          `${p.moduleName}.${p.name}`.toLowerCase().includes(q) ||
          p.description.some((t) => t.text.toLowerCase().includes(q)),
      )
    : parts;

  return (
    <div className="part-list-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "Parts", "パーツ一覧", "Partoj")}
        </h2>
        <div className="view-actions">
          <input
            type="search"
            className="input input-sm search-input"
            placeholder={label(
              language,
              "Search parts...",
              "パーツを検索...",
              "Serĉi partojn...",
            )}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="part-grid">
        {filteredParts.length === 0 ? (
          <div className="empty-state">
            <p>
              {label(
                language,
                "No parts found",
                "パーツが見つかりません",
                "Neniuj partoj trovitaj",
              )}
            </p>
          </div>
        ) : (
          filteredParts.map((part) => {
            const isChanged = workingChanges.parts.has(part.partId);
            return (
              <Link
                key={part.partId}
                href={`/part/${part.partId}`}
                className="card part-card"
              >
                <div className="part-card-header">
                  <span className="part-breadcrumb">
                    {part.moduleName} /{" "}
                    <strong className="part-name-text">{part.name}</strong>
                  </span>
                  {isChanged && (
                    <span
                      className="badge badge-warning"
                      title="Uncommitted changes"
                    >
                      ●
                    </span>
                  )}
                </div>
                {part.description.length > 0 && (
                  <p className="part-card-desc">
                    {localizedText(part.description, language)}
                  </p>
                )}
                <div className="part-card-footer">
                  <PlayIcon size={14} className="part-card-play-icon" />
                  <span className="part-card-link-text">
                    {label(
                      language,
                      "Open & Evaluate",
                      "開いて評価",
                      "Malfermi kaj taksi",
                    )}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
