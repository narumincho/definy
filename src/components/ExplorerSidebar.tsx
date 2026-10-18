import { useState, useCallback, useEffect, type JSX } from "react";
import { Link } from "@void/react";
import { Icon } from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

export function ExplorerSidebar(): JSX.Element {
  const { language, modules, parts, workingChanges, setSidebarOpen } =
    useDefiny();
  const [filterQuery, setFilterQuery] = useState("");
  const [collapsedModules, setCollapsedModules] = useState<ReadonlySet<string>>(
    new Set(),
  );
  // 初回レンダーは SSR と同じ既定値にし、保存値はマウント後に反映する
  const [sidebarWidth, setSidebarWidth] = useState(260);
  useEffect(() => {
    const stored = localStorage.getItem("definy.sidebar.width");
    if (stored) setSidebarWidth(Number(stored) || 260);
  }, []);

  const query = filterQuery.trim().toLowerCase();

  const toggleModuleCollapse = useCallback((moduleId: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      function onMouseMove(moveEvent: MouseEvent): void {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(140, Math.min(600, startWidth + delta));
        setSidebarWidth(newWidth);
        localStorage.setItem("definy.sidebar.width", String(newWidth));
      }

      function onMouseUp(): void {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      }

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [sidebarWidth],
  );

  return (
    <aside
      className="sidebar-tree"
      style={{ width: `${sidebarWidth}px`, flexBasis: `${sidebarWidth}px` }}
    >
      <div className="sidebar-header">
        <span className="sidebar-title">
          {label(language, "Explorer", "エクスプローラー", "Esplorilo")}
        </span>
        <div className="sidebar-actions">
          <Link
            href="/?create=module"
            className="sidebar-action-btn"
            title={label(
              language,
              "New module",
              "新しいモジュール",
              "Nova modulo",
            )}
          >
            +
          </Link>
        </div>
      </div>

      <div className="sidebar-filter-container">
        <input
          type="search"
          className="sidebar-filter-input"
          placeholder={label(language, "Filter...", "絞り込み...", "Filtri...")}
          value={filterQuery}
          onChange={(e) => {
            setFilterQuery(e.target.value);
          }}
        />
      </div>

      <div className="sidebar-scroll">
        {modules.length === 0 ? (
          <div className="sidebar-empty">
            {label(
              language,
              "No modules yet",
              "モジュールがまだありません",
              "Ankoraŭ neniuj moduloj",
            )}
          </div>
        ) : (
          modules.map((mod) => {
            const isCollapsed = collapsedModules.has(mod.moduleId);
            const moduleParts = parts.filter(
              (p) => p.moduleId === mod.moduleId,
            );
            const filteredParts = query
              ? moduleParts.filter(
                  (p) =>
                    p.name.toLowerCase().includes(query) ||
                    `${mod.name}.${p.name}`.toLowerCase().includes(query),
                )
              : moduleParts;

            if (query && filteredParts.length === 0) {
              return null;
            }

            return (
              <div key={mod.moduleId} className="sidebar-module-group">
                <button
                  type="button"
                  className="sidebar-tree-node module-node"
                  onClick={() => {
                    toggleModuleCollapse(mod.moduleId);
                  }}
                >
                  <Icon
                    kind="chevronRight"
                    size={14}
                    className={`sidebar-chevron ${isCollapsed ? "" : "expanded"}`}
                  />
                  <Icon
                    kind="modules"
                    size={15}
                    className="sidebar-node-icon tree-icon-module"
                  />
                  <span className="sidebar-node-label">{mod.name}</span>
                  <span className="sidebar-count">{moduleParts.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="sidebar-module-parts">
                    {filteredParts.map((part) => {
                      const isChanged = workingChanges.parts.has(part.partId);
                      return (
                        <Link
                          key={part.partId}
                          href={`/part/${part.partId}`}
                          className="sidebar-tree-node part-node"
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setSidebarOpen(false);
                            }
                          }}
                        >
                          <Icon
                            kind="part"
                            size={15}
                            className="sidebar-node-icon tree-icon-part"
                          />
                          <span className="sidebar-node-label">
                            {part.name}
                          </span>
                          {isChanged && (
                            <span
                              className="sidebar-dirty-dot"
                              title="Modified"
                            >
                              ●
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        className="sidebar-resizer"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
      />
    </aside>
  );
}
