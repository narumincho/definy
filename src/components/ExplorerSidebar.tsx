import {
  memo,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type JSX,
} from "react";
import { useRouter } from "@void/react";
import { Link } from "./Link.tsx";
import {
  ChevronRightIcon,
  ModuleIcon,
  PartsIcon,
  ProjectIcon,
} from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { withNewParts } from "../new_part.ts";
import { MAIN_BRANCH } from "../event_content.ts";
import type { ModuleSnapshot } from "../types.ts";

const SIDEBAR_WIDTH_STORAGE_KEY = "definy.sidebar.width";
const MIN_SIDEBAR_WIDTH = 160;
const MAX_SIDEBAR_WIDTH = 600;
/** 矢印キーで幅を変えるときの 1 回分 */
const SIDEBAR_WIDTH_KEY_STEP = 16;

function clampSidebarWidth(width: number): number {
  return Math.round(
    Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width)),
  );
}

function loadSidebarWidth(): number | null {
  try {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return stored > 0 ? clampSidebarWidth(stored) : null;
  } catch {
    return null;
  }
}

function saveSidebarWidth(width: number | null): void {
  try {
    if (width === null) {
      localStorage.removeItem(SIDEBAR_WIDTH_STORAGE_KEY);
    } else {
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
    }
  } catch {
    // 保存できなくても今の表示の幅はそのまま使う
  }
}

export function ExplorerSidebar(): JSX.Element {
  const {
    language,
    projects,
    modules: committedModules,
    parts: committedParts,
    workingChanges,
    setSidebarOpen,
    partTypeCheckResults,
    typeCheckMessage,
  } = useDefiny();
  // 作業中の変更だけにある新しいパーツ (とそのモジュール) も出す
  const { modules, parts } = useMemo(
    () => withNewParts(committedModules, committedParts, workingChanges),
    [committedModules, committedParts, workingChanges],
  );
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
  const [collapsedProjects, setCollapsedProjects] = useState<
    ReadonlySet<string>
  >(new Set());
  // プロジェクト ▸ モジュール ▸ パーツ の木にする. プロジェクトはモジュールが最初に現れた順
  const projectGroups = useMemo(() => {
    const groups = new Map<string, ModuleSnapshot[]>();
    for (const mod of modules) {
      const group = groups.get(mod.projectName);
      if (group === undefined) {
        groups.set(mod.projectName, [mod]);
      } else {
        group.push(mod);
      }
    }
    return Array.from(groups, ([projectName, projectModules]) => ({
      projectName,
      branch:
        projects.find((p) => p.name === projectName)?.branch ?? MAIN_BRANCH,
      modules: projectModules,
    }));
  }, [modules, projects]);
  // エクスプローラーの幅. ワークベンチのグリッドの列 (`--sidebar-width`) をワークベンチの要素に直接書き換える.
  // ドラッグ中に React の state を変えると大きなツリーを毎回描画し直すので, 確定したときだけ state にする.
  // `null` は CSS の既定の幅 (画面の幅で変わる). 初回レンダーは SSR と揃え, 保存値はマウント後に反映する
  const asideRef = useRef<HTMLElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const applySidebarWidth = useCallback((width: number | null) => {
    const workbench = asideRef.current?.parentElement;
    if (width === null) {
      workbench?.style.removeProperty("--sidebar-width");
    } else {
      workbench?.style.setProperty("--sidebar-width", `${width}px`);
    }
  }, []);
  const commitSidebarWidth = useCallback(
    (width: number | null) => {
      applySidebarWidth(width);
      setSidebarWidth(width);
      saveSidebarWidth(width);
    },
    [applySidebarWidth],
  );
  useEffect(() => {
    const stored = loadSidebarWidth();
    applySidebarWidth(stored);
    setSidebarWidth(stored);
  }, [applySidebarWidth]);
  const currentSidebarWidth = (): number =>
    asideRef.current?.getBoundingClientRect().width ?? MIN_SIDEBAR_WIDTH;

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
  const selectedProjectName = modules.find(
    (m) => m.moduleId === selectedModuleId,
  )?.projectName;

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
    setCollapsedProjects((prev) => {
      if (selectedProjectName === undefined || !prev.has(selectedProjectName)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(selectedProjectName);
      return next;
    });
  }, [selectedPartId, selectedModuleId, selectedProjectName]);
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

  // 狭い画面ではドロワーを閉じてパーツを見せる (広い画面では何も変わらない)
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

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

  const toggleProjectCollapse = useCallback((projectName: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectName)) {
        next.delete(projectName);
      } else {
        next.add(projectName);
      }
      return next;
    });
  }, []);

  /** 境界をドラッグして幅を変える. ポインターをキャプチャして, 境界から外れても追いかける */
  function handleResizePointerDown(
    e: React.PointerEvent<HTMLDivElement>,
  ): void {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startWidth = currentSidebarWidth();
    let width = clampSidebarWidth(startWidth);
    handle.setPointerCapture(pointerId);
    document.body.classList.add("sidebar-resizing");

    function onPointerMove(moveEvent: PointerEvent): void {
      width = clampSidebarWidth(startWidth + moveEvent.clientX - startX);
      applySidebarWidth(width);
    }
    function onPointerEnd(): void {
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerEnd);
      handle.removeEventListener("pointercancel", onPointerEnd);
      document.body.classList.remove("sidebar-resizing");
      if (handle.hasPointerCapture(pointerId)) {
        handle.releasePointerCapture(pointerId);
      }
      commitSidebarWidth(width);
    }
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerEnd);
    handle.addEventListener("pointercancel", onPointerEnd);
  }

  /** 矢印キーで幅を変え, Home / ダブルクリックで既定の幅に戻す */
  function handleResizeKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const delta =
        e.key === "ArrowLeft"
          ? -SIDEBAR_WIDTH_KEY_STEP
          : SIDEBAR_WIDTH_KEY_STEP;
      commitSidebarWidth(clampSidebarWidth(currentSidebarWidth() + delta));
    } else if (e.key === "Home") {
      e.preventDefault();
      commitSidebarWidth(null);
    }
  }

  return (
    <aside className="workbench-sidebar" ref={asideRef}>
      <div className="sidebar-header">
        <span className="sidebar-title">
          {label(language, "Explorer", "エクスプローラー", "Esplorilo")}
        </span>
        <div className="sidebar-actions">
          <Link
            href="/new-part"
            className="sidebar-action-btn"
            title={label(
              language,
              "New part (or module)",
              "新しいパーツ (モジュール)",
              "Nova parto (aŭ modulo)",
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
          projectGroups.map(
            ({ projectName, branch, modules: projectModules }) => {
              const isProjectCollapsed = collapsedProjects.has(projectName);
              const matches = (mod: ModuleSnapshot): boolean =>
                parts.some(
                  (p) =>
                    p.moduleId === mod.moduleId &&
                    (p.name.toLowerCase().includes(query) ||
                      `${mod.name}.${p.name}`.toLowerCase().includes(query)),
                );
              if (query && !projectModules.some(matches)) {
                return null;
              }
              return (
                <div
                  key={projectName}
                  className="sidebar-project-group"
                  data-project={projectName}
                >
                  <button
                    type="button"
                    className="sidebar-tree-node project-node"
                    aria-expanded={!isProjectCollapsed}
                    onClick={() => {
                      toggleProjectCollapse(projectName);
                    }}
                  >
                    <ChevronRightIcon
                      size={14}
                      className={`sidebar-chevron ${isProjectCollapsed ? "" : "expanded"}`}
                    />
                    <ProjectIcon
                      size={15}
                      className="sidebar-node-icon tree-icon-project"
                    />
                    <span className="sidebar-node-label">
                      {projectName === ""
                        ? label(
                            language,
                            "(no project)",
                            "(プロジェクトなし)",
                            "(sen projekto)",
                          )
                        : projectName}
                    </span>
                    <span
                      className="sidebar-branch"
                      title={label(language, "Branch", "ブランチ", "Branĉo")}
                    >
                      {branch}
                    </span>
                  </button>
                  {!isProjectCollapsed &&
                    projectModules.map((mod) => {
                      const isCollapsed = collapsedModules.has(mod.moduleId);
                      const moduleParts = parts.filter(
                        (p) => p.moduleId === mod.moduleId,
                      );
                      const filteredParts = query
                        ? moduleParts.filter(
                            (p) =>
                              p.name.toLowerCase().includes(query) ||
                              `${mod.name}.${p.name}`
                                .toLowerCase()
                                .includes(query),
                          )
                        : moduleParts;

                      if (query && filteredParts.length === 0) {
                        return null;
                      }
                      const moduleTypeErrorCount = moduleParts.filter(
                        (p) => typeErrorOf(p) !== null,
                      ).length;

                      return (
                        <div
                          key={mod.moduleId}
                          className="sidebar-module-group"
                        >
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
                            <span className="sidebar-node-label">
                              {mod.name}
                            </span>
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
                            <span className="sidebar-count">
                              {moduleParts.length}
                            </span>
                          </button>

                          {!isCollapsed && (
                            <div className="sidebar-module-parts">
                              {filteredParts.map((part) => {
                                const change = workingChanges.parts.get(
                                  part.partId,
                                );
                                const isChanged = change !== undefined;
                                const typeError = typeErrorOf(part);
                                const isSelected =
                                  part.partId === selectedPartId;
                                return (
                                  <PartNode
                                    key={part.partId}
                                    partId={part.partId}
                                    name={change?.name ?? part.name}
                                    deleted={change?.deleted === true}
                                    isChanged={isChanged}
                                    typeError={typeError}
                                    isSelected={isSelected}
                                    onNavigate={closeSidebar}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            },
          )
        )}
      </div>

      <div
        className="sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={label(
          language,
          "Resize Explorer (double-click to reset)",
          "エクスプローラーの幅を変える (ダブルクリックで元に戻す)",
          "Ŝanĝi la larĝon de la esplorilo (duoble alklaku por restarigi)",
        )}
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        {...(sidebarWidth !== null ? { "aria-valuenow": sidebarWidth } : {})}
        tabIndex={0}
        onPointerDown={handleResizePointerDown}
        onKeyDown={handleResizeKeyDown}
        onDoubleClick={() => {
          commitSidebarWidth(null);
        }}
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

/**
 * エクスプローラーのパーツ 1 つ. 式を変えるたびに作業中の変更が変わりエクスプローラー全体を描き直すので,
 * 見た目の変わらない行は描かない (#762)
 */
const PartNode = memo(function PartNode({
  partId,
  name,
  deleted,
  isChanged,
  typeError,
  isSelected,
  onNavigate,
}: {
  readonly partId: string;
  readonly name: string;
  readonly deleted: boolean;
  readonly isChanged: boolean;
  readonly typeError: string | null;
  readonly isSelected: boolean;
  readonly onNavigate: () => void;
}): JSX.Element {
  return (
    <Link
      href={`/part/${partId}`}
      className={`sidebar-tree-node part-node ${isSelected ? "selected" : ""}`}
      data-deleted={deleted ? "" : undefined}
      aria-current={isSelected ? "page" : undefined}
      onClick={onNavigate}
    >
      <PartsIcon size={15} className="sidebar-node-icon tree-icon-part" />
      <span className="sidebar-node-label">{name}</span>
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
        <span className="sidebar-dirty-dot" title="Modified">
          ●
        </span>
      )}
    </Link>
  );
});
