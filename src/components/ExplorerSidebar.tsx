import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type JSX,
} from "react";
import { Link, useRouter } from "@void/react";
import { ChevronRightIcon, ModuleIcon } from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

export function ExplorerSidebar(): JSX.Element {
  const {
    language,
    modules,
    parts,
    workingChanges,
    setSidebarOpen,
    partTypeCheckResults,
    typeCheckMessage,
  } = useDefiny();
  // 型エラー (と型チェッカーの失敗) の理由. 式の無いパーツ・コンパイラ組み込み (unsupported) は出さない
  const typeErrorOf = (part: {
    readonly name: string;
    readonly partIdHash?: string | null;
  }): string | null => {
    const outcome =
      part.partIdHash == null
        ? undefined
        : partTypeCheckResults.get(part.partIdHash);
    return outcome === undefined || outcome.kind === "unsupported"
      ? null
      : typeCheckMessage(part.name, outcome);
  };
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

  // 開いているパーツ (VSCode のアクティブなファイルのように強調表示する).
  // window.location は SSR で読めずハイドレーション不一致になるため Void Router から取る
  const currentPath = useRouter().path;
  const selectedPart = useMemo(() => {
    const id = partIdFromPath(currentPath);
    if (id === null) return undefined;
    // パーツ詳細ページと同じく ID・名前・モジュール名付きの名前のどれでも開ける
    return parts.find(
      (p) =>
        p.partId === id || p.name === id || `${p.moduleName}.${p.name}` === id,
    );
  }, [currentPath, parts]);
  const selectedPartId = selectedPart?.partId;
  const selectedModuleId = selectedPart?.moduleId;

  // 選択が変わったら, 折りたたまれたモジュールを開いて選択中のパーツが見えるようにする
  const scrollRef = useRef<HTMLDivElement>(null);
  const revealPendingRef = useRef(false);
  useEffect(() => {
    if (selectedPartId === undefined || selectedModuleId === undefined) return;
    revealPendingRef.current = true;
    setCollapsedModules((prev) => {
      if (!prev.has(selectedModuleId)) return prev;
      const next = new Set(prev);
      next.delete(selectedModuleId);
      return next;
    });
  }, [selectedPartId, selectedModuleId]);
  // モジュールを開いた後のレンダーで要素が現れてからスクロールする
  useEffect(() => {
    if (!revealPendingRef.current) return;
    const selectedElement = scrollRef.current?.querySelector(
      '.part-node[aria-current="page"]',
    );
    if (selectedElement == null) return;
    revealPendingRef.current = false;
    selectedElement.scrollIntoView({ block: "nearest" });
  });

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
      className="workbench-sidebar"
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
          <button
            type="button"
            className="sidebar-action-btn sidebar-close-btn"
            title={label(language, "Close", "閉じる", "Fermi")}
            aria-label={label(language, "Close", "閉じる", "Fermi")}
            onClick={() => {
              setSidebarOpen(false);
            }}
          >
            ×
          </button>
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

      <div className="sidebar-scroll" ref={scrollRef}>
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
            const moduleTypeErrorCount = moduleParts.filter(
              (p) => typeErrorOf(p) !== null,
            ).length;

            return (
              <div key={mod.moduleId} className="sidebar-module-group">
                <button
                  type="button"
                  className="sidebar-tree-node module-node"
                  onClick={() => {
                    toggleModuleCollapse(mod.moduleId);
                  }}
                >
                  <ChevronRightIcon
                    size={14}
                    className={`sidebar-chevron ${isCollapsed ? "" : "expanded"}`}
                  />
                  <ModuleIcon
                    size={15}
                    className="sidebar-node-icon tree-icon-module"
                  />
                  <span className="sidebar-node-label">{mod.name}</span>
                  {moduleTypeErrorCount > 0 && (
                    <span
                      className="sidebar-type-error-count"
                      title={label(
                        language,
                        `${moduleTypeErrorCount} parts with type errors`,
                        `型エラーのあるパーツ ${moduleTypeErrorCount} 件`,
                        `${moduleTypeErrorCount} partoj kun tiperaroj`,
                      )}
                    >
                      {moduleTypeErrorCount}
                    </span>
                  )}
                  <span className="sidebar-count">{moduleParts.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="sidebar-module-parts">
                    {filteredParts.map((part) => {
                      const isChanged = workingChanges.parts.has(part.partId);
                      const typeError = typeErrorOf(part);
                      const isSelected = part.partId === selectedPartId;
                      return (
                        <Link
                          key={part.partId}
                          href={`/part/${part.partId}`}
                          className={`sidebar-tree-node part-node ${isSelected ? "selected" : ""}`}
                          aria-current={isSelected ? "page" : undefined}
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setSidebarOpen(false);
                            }
                          }}
                        >
                          <ModuleIcon
                            size={15}
                            className="sidebar-node-icon tree-icon-part"
                          />
                          <span className="sidebar-node-label">
                            {part.name}
                          </span>
                          {typeError !== null && (
                            <span
                              className="sidebar-type-error-dot"
                              title={typeError}
                              aria-label={typeError}
                            >
                              ●
                            </span>
                          )}
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

/** `/part/{id}` のパスから id を取り出す. パーツ詳細ページでなければ null */
function partIdFromPath(path: string): string | null {
  const match = /^\/part\/([^/?#]+)/.exec(path);
  const encoded = match?.[1];
  if (encoded === undefined) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}
