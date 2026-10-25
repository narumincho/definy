import { useState, type JSX } from "react";
import { useRouter } from "@void/react";
import { Link } from "../src/components/Link.tsx";
import {
  CHANGES_ONLY_HREF,
  WorkingChanges,
} from "../src/components/WorkingChanges.tsx";
import { PlayIcon } from "../src/icons.tsx";
import { label, localizedText, withLanguage } from "../src/language.ts";
import { moduleOfPartId } from "../src/new_part.ts";
import { useDefiny } from "../src/state.tsx";
import type { LocalizedText } from "../src/cbor.ts";

/** パーツ一覧の 1 行. コミット済みのパーツに作業中の変更 (新規・変更・削除) を重ねたもの */
type PartListItem = {
  readonly partId: string;
  readonly moduleName: string;
  readonly name: string;
  readonly description: LocalizedText;
  readonly status: "committed" | "new" | "changed" | "deleted";
};

export default function PartsPage(): JSX.Element {
  const { language, parts, workingChanges } = useDefiny();
  const router = useRouter();
  const changesOnly = router.query.get("changes") === "only";
  const [search, setSearch] = useState("");
  const changesCount =
    workingChanges.parts.size + (workingChanges.moduleVisibilities?.size ?? 0);

  const setChangesOnly = (next: boolean): void => {
    router.visit(withLanguage(next ? CHANGES_ONLY_HREF : "/parts", language), {
      replace: true,
      preserveState: true,
      preserveScroll: true,
    });
  };

  const committedIds = new Set(parts.map((p) => p.partId));
  const items: ReadonlyArray<PartListItem> = [
    ...parts.map((part): PartListItem => {
      const change = workingChanges.parts.get(part.partId);
      return {
        partId: part.partId,
        moduleName: part.moduleName,
        name: change?.name ?? part.name,
        description: change?.description ?? part.description,
        status:
          change === undefined
            ? "committed"
            : change.deleted === true
              ? "deleted"
              : "changed",
      };
    }),
    // まだコミットしていない新しいパーツ
    ...Array.from(workingChanges.parts.entries())
      .filter(([partId]) => !committedIds.has(partId))
      .map(([partId, change]): PartListItem => ({
        partId,
        moduleName: moduleOfPartId(partId),
        name: change.name,
        description: change.description,
        status: change.deleted === true ? "deleted" : "new",
      })),
  ];

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.moduleName.toLowerCase().includes(q) ||
          `${p.moduleName}.${p.name}`.toLowerCase().includes(q) ||
          p.description.some((t) => t.text.toLowerCase().includes(q)),
      )
    : items;

  return (
    <div className="part-list-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "Parts", "パーツ一覧", "Partoj")}
        </h2>
        <div className="view-actions">
          <button
            type="button"
            className={`btn btn-sm changes-only-toggle ${changesOnly ? "btn-primary" : "btn-secondary"}`}
            aria-pressed={changesOnly}
            onClick={() => {
              setChangesOnly(!changesOnly);
            }}
          >
            {label(language, "Changes only", "変更のみ表示", "Nur ŝanĝoj")}
            {changesCount > 0 && (
              <span className="changes-only-count">{changesCount}</span>
            )}
          </button>
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

      {changesOnly ? (
        <WorkingChanges search={search} />
      ) : (
        <div className="part-grid">
          {filteredItems.length === 0 ? (
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
            filteredItems.map((part) => (
              <Link
                key={part.partId}
                href={`/part/${part.partId}`}
                className="card part-card"
                data-status={part.status}
              >
                <div className="part-card-header">
                  <span className="part-breadcrumb">
                    {part.moduleName} /{" "}
                    <strong className="part-name-text">{part.name}</strong>
                  </span>
                  <PartStatusBadge status={part.status} />
                </div>
                {part.description.length > 0 && (
                  <p className="part-card-desc">
                    {localizedText(part.description, language)}
                  </p>
                )}
                <div className="part-card-footer">
                  <PlayIcon size={14} className="part-card-play-icon" />
                  <span className="part-card-link-text">
                    {label(language, "Open", "開く", "Malfermi")}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PartStatusBadge(props: {
  readonly status: PartListItem["status"];
}): JSX.Element | null {
  const { language } = useDefiny();
  switch (props.status) {
    case "committed":
      return null;
    case "changed":
      return (
        <span
          className="badge badge-warning"
          title={label(
            language,
            "Uncommitted changes",
            "未コミットの変更",
            "Neenmetitaj ŝanĝoj",
          )}
        >
          ●
        </span>
      );
    case "new":
      return (
        <span className="badge badge-success">
          {label(language, "New", "新規", "Nova")}
        </span>
      );
    case "deleted":
      return (
        <span className="badge badge-invalid-signature">
          {label(language, "Delete", "削除", "Forigi")}
        </span>
      );
  }
}
