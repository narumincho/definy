import type { JSX } from "react";
import { Link } from "@void/react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function ChangesPage(): JSX.Element {
  const {
    language,
    workingChanges,
    discardWorkingPart,
    discardAllWorkingChanges,
  } = useDefiny();

  const changeEntries = Array.from(workingChanges.parts.entries());

  return (
    <div className="changes-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(
            language,
            "Working Changes",
            "作業中の変更",
            "Laborkontrolaj ŝanĝoj",
          )}
        </h2>
        {changeEntries.length > 0 && (
          <div className="view-actions">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={discardAllWorkingChanges}
            >
              {label(language, "Discard all", "すべて破棄", "Forĵeti ĉiujn")}
            </button>
          </div>
        )}
      </div>

      <div className="changes-list">
        {changeEntries.length === 0 ? (
          <div className="empty-state">
            <p>
              {label(
                language,
                "No uncommitted changes",
                "未コミットの変更はありません",
                "Neniuj neenmetitaj ŝanĝoj",
              )}
            </p>
          </div>
        ) : (
          changeEntries.map(([partId, change]) => (
            <div key={partId} className="card change-card">
              <div className="change-card-header">
                <strong>{change.name}</strong>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-danger"
                  onClick={() => {
                    discardWorkingPart(partId);
                  }}
                >
                  {label(language, "Discard", "破棄", "Forĵeti")}
                </button>
              </div>
              <p className="change-desc">{change.description}</p>
              <div className="change-card-footer">
                <Link
                  href={`/part/${partId}`}
                  className="btn btn-primary btn-xs"
                >
                  {label(language, "Edit →", "編集 →", "Redakti →")}
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
