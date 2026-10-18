import type { JSX } from "react";
import { Link } from "@void/react";
import { Icon } from "../src/icons.tsx";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function ModulesPage(): JSX.Element {
  const { language, modules } = useDefiny();

  return (
    <div className="module-list-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "Modules", "モジュール一覧", "Moduloj")}
        </h2>
      </div>

      <div className="module-grid">
        {modules.length === 0 ? (
          <div className="empty-state">
            <p>
              {label(
                language,
                "No modules found",
                "モジュールがありません",
                "Neniuj moduloj trovitaj",
              )}
            </p>
          </div>
        ) : (
          modules.map((mod) => (
            <Link
              key={mod.moduleId}
              href={`/module/${mod.moduleId}`}
              className="card module-card"
            >
              <div className="module-card-header">
                <Icon kind="modules" className="module-card-icon" />
                <h3 className="module-card-title">{mod.name}</h3>
                <span className="badge badge-neutral">
                  {mod.parts.length} parts
                </span>
              </div>
              {mod.description && (
                <p className="module-card-desc">{mod.description}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
