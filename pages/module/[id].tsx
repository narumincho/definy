import type { JSX } from "react";
import { useParams } from "@void/react";
import { Link } from "../../src/components/Link.tsx";
import { label, localizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { usePageTitle } from "../../src/page_title.ts";
import { MAIN_BRANCH } from "../../src/event_content.ts";

export default function ModuleDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { language, modules, parts, projectOfModule } = useDefiny();

  const mod = modules.find((m) => m.moduleId === id) ?? {
    moduleId: id ?? "unknown",
    name: id ?? "unknown",
    projectName: projectOfModule(id ?? "") ?? "",
    branch: MAIN_BRANCH,
    branches: [],
    description: [],
    latestEventHash: "",
    parentCommitHash: null,
    message: "",
    parts: [],
    updatedAtMs: Date.now(),
  };

  usePageTitle(mod.name);

  const moduleParts = parts.filter((p) => p.moduleId === id);

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
        {mod.projectName !== "" && (
          <div className="module-branch module-project">
            <span>
              {label(language, "Project", "プロジェクト", "Projekto")}
            </span>
            <Link
              href={`/project/${encodeURIComponent(mod.projectName)}`}
              className="meta-link"
            >
              {mod.projectName}
            </Link>
            {mod.branches.length > 0 && (
              <span className="text-muted">
                {label(
                  language,
                  `Branch: ${mod.branch} (change it on the project page)`,
                  `ブランチ: ${mod.branch} (プロジェクトのページで切り替えます)`,
                  `Branĉo: ${mod.branch}`,
                )}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="module-parts-section">
        <div className="module-parts-heading">
          <h3>
            {label(
              language,
              "Parts in this module",
              "このモジュールのパーツ",
              "Partoj en ĉi tiu modulo",
            )}
          </h3>
          <Link
            href={`/new-part?module=${encodeURIComponent(mod.name)}`}
            className="btn btn-primary btn-xs"
          >
            {label(language, "+ New Part", "+ 新しいパーツ", "+ Nova parto")}
          </Link>
        </div>
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
