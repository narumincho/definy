import type { JSX } from "react";
import { useParams, Link } from "@void/react";
import { label } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";

export default function ModuleDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { language, modules, parts } = useDefiny();

  const mod = modules.find((m) => m.moduleId === id) ?? {
    moduleId: id ?? "unknown",
    name: id ?? "unknown",
    description: "Module details",
    latestEventHash: "",
    message: "",
    parts: [],
    updatedAtMs: Date.now(),
  };

  const moduleParts = parts.filter((p) => p.moduleId === id);

  return (
    <div className="module-detail-view">
      <div className="card module-header">
        <h2 className="module-title">{mod.name}</h2>
        {mod.description && <p className="module-desc">{mod.description}</p>}
      </div>

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
                {part.description && <p>{part.description}</p>}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
