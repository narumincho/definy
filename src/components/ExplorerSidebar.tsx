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
import { CHANGES_ONLY_HREF } from "./WorkingChanges.tsx";
import {
  BranchIcon,
  ChevronRightIcon,
  CommitIcon,
  ModuleIcon,
  PartsIcon,
  ProjectIcon,
  type IconComponent,
} from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { withNewParts } from "../new_part.ts";
import { MAIN_BRANCH } from "../event_content.ts";
import { buildExplorerTree } from "../explorer_tree.ts";
import type { LanguageCode } from "../types.ts";

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

/** 木の段. 字下げとアイコンの色に使う */
type TreeLevel = "project" | "branch" | "commit" | "module" | "part";

/** 段ごとの開閉のキー (同じ名前のモジュールでもブランチが違えば別のノード) */
const projectKey = (project: string): string => `p:${project}`;
const branchKey = (project: string, branch: string): string =>
  `b:${project}/${branch}`;
const commitKey = (project: string, branch: string): string =>
  `c:${project}/${branch}`;
const moduleKey = (project: string, branch: string, module: string): string =>
  `m:${project}/${branch}/${module}`;

export function ExplorerSidebar(): JSX.Element {
  const {
    language,
    projects,
    modules: committedModules,
    parts: committedParts,
    workingChanges,
    decodedCommits,
    accountNames,
    currentAccount,
    selectBranch,
    loadEvent,
    setSidebarOpen,
    partTypeCheckResults,
    typeCheckMessage,
  } = useDefiny();
  // 作業中の変更だけにある新しいパーツ (とそのモジュール) も出す
  const { modules, parts } = useMemo(
    () => withNewParts(committedModules, committedParts, workingChanges),
    [committedModules, committedParts, workingChanges],
  );
  // プロジェクト ▸ ブランチ ▸ コミット ▸ モジュール ▸ パーツ の木 (src/explorer_tree.ts)
  const tree = useMemo(() => {
    const byHash = new Map(
      decodedCommits.map((c) => [c.event.eventHash, c.commit]),
    );
    return buildExplorerTree({
      projects,
      modules,
      parts,
      commitByHash: (hash) => byHash.get(hash) ?? null,
    });
  }, [projects, modules, parts, decodedCommits]);
  // 型エラー (と型チェッカーの失敗) の理由. 式の無いパーツ・コンパイラ組み込み (unsupported) は出さない
  const typeErrorOf = (part: {
    readonly partId: string;
    readonly partIdHash: string | null;
  }): string | null => {
    const outcome =
      part.partIdHash === null
        ? undefined
        : partTypeCheckResults.get(part.partIdHash);
    return outcome === undefined || outcome.kind === "unsupported"
      ? null
      : typeCheckMessage(part.partId, outcome);
  };
  const [filterQuery, setFilterQuery] = useState("");
  // 既定の開閉 (表示しているブランチとその中身は開く, 他のブランチは閉じる) から切り替えたノード
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());
  const isOpen = (key: string, defaultOpen: boolean): boolean =>
    defaultOpen !== toggled.has(key);
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
  const matchesQuery = (moduleName: string, partName: string): boolean =>
    partName.toLowerCase().includes(query) ||
    `${moduleName}.${partName}`.toLowerCase().includes(query);

  // 開いているパーツ (VSCode のアクティブなファイルのように強調表示する).
  // window.location は SSR で読めずハイドレーション不一致になるため Void Router から取る
  const router = useRouter();
  const currentPath = router.path;
  // ブランチの行は `/project/{名前}?branch={ブランチ}` へのリンク. そのときはプロジェクトではなくブランチを強調する
  const currentBranchQuery = router.query.get("branch");
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
  const selectedModuleName = selectedPart?.moduleName;
  const selectedProjectName = modules.find(
    (m) => m.name === selectedModuleName,
  )?.projectName;
  const selectedBranch =
    projects.find((p) => p.name === selectedProjectName)?.branch ?? MAIN_BRANCH;

  // 選択が変わったら, 閉じている上の段 (表示しているブランチの) を開いて選択中のパーツが見えるようにする.
  // 表示しているブランチの段は既定で開いているので, 切り替えた印を消せば開く
  const scrollRef = useRef<HTMLDivElement>(null);
  const revealPendingRef = useRef(false);
  useEffect(() => {
    if (
      selectedPartId === undefined ||
      selectedModuleName === undefined ||
      selectedProjectName === undefined
    ) {
      return;
    }
    revealPendingRef.current = true;
    const keys = [
      projectKey(selectedProjectName),
      branchKey(selectedProjectName, selectedBranch),
      commitKey(selectedProjectName, selectedBranch),
      moduleKey(selectedProjectName, selectedBranch, selectedModuleName),
    ];
    setToggled((prev) => {
      if (!keys.some((key) => prev.has(key))) return prev;
      const next = new Set(prev);
      for (const key of keys) next.delete(key);
      return next;
    });
  }, [selectedPartId, selectedModuleName, selectedProjectName, selectedBranch]);
  // 上の段を開いた後のレンダーで要素が現れてからスクロールする
  useEffect(() => {
    if (!revealPendingRef.current) return;
    const selectedElement = scrollRef.current?.querySelector(
      '.sidebar-tree-node[aria-current="page"]',
    );
    if (selectedElement == null) return;
    revealPendingRef.current = false;
    selectedElement.scrollIntoView({ block: "nearest" });
  });

  // 狭い画面ではドロワーを閉じてパーツを見せる (広い画面では何も変わらない)
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const toggle = useCallback((key: string) => {
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  /** 表示していないブランチの中のリンクは, そのブランチを表示してから開く */
  const navigateIn = (projectName: string, branch: string): (() => void) => {
    return () => {
      selectBranch(projectName, branch);
      closeSidebar();
    };
  };

  // 開いたブランチの最新のコミットをまだ読んでいなければ読む (中のモジュール・パーツを出すため)
  const unloadedOpenCommits = tree.flatMap((project) =>
    isOpen(projectKey(project.name), true)
      ? project.branches.filter(
          (branch) =>
            branch.commit === null &&
            branch.latestEventHash !== "" &&
            isOpen(branchKey(project.name, branch.name), branch.displayed),
        )
      : [],
  );
  const unloadedKey = unloadedOpenCommits
    .map((branch) => branch.latestEventHash)
    .join(",");
  useEffect(() => {
    for (const hash of unloadedKey === "" ? [] : unloadedKey.split(",")) {
      void loadEvent(hash);
    }
  }, [unloadedKey, loadEvent]);

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

  const addLabel = (en: string, ja: string, eo: string): string =>
    label(language, en, ja, eo);

  return (
    <aside className="workbench-sidebar" ref={asideRef}>
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
        {/* 狭い画面のドロワーを閉じる (CSS で狭い画面だけ表示) */}
        <button
          type="button"
          className="sidebar-action-btn sidebar-close-btn"
          title={label(language, "Close", "閉じる", "Fermi")}
          aria-label={label(language, "Close", "閉じる", "Fermi")}
          onClick={closeSidebar}
        >
          ×
        </button>
      </div>

      <div className="sidebar-scroll" ref={scrollRef}>
        {query === "" && (
          <AddRow
            level="project"
            href="/new-part"
            text={addLabel(
              "Add project",
              "プロジェクトの追加",
              "Aldoni projekton",
            )}
            onNavigate={closeSidebar}
          />
        )}
        {tree.map((project) => {
          const pKey = projectKey(project.name);
          const projectOpen = query !== "" || isOpen(pKey, true);
          const projectHasMatch =
            query === "" ||
            project.branches.some((branch) =>
              branch.commit?.modules.some((mod) =>
                mod.parts.some((part) => matchesQuery(mod.name, part.name)),
              ),
            );
          if (!projectHasMatch) return null;
          return (
            <div
              key={project.name}
              className="sidebar-project-group"
              data-project={project.name}
            >
              <TreeRow
                level="project"
                open={projectOpen}
                onToggle={() => {
                  toggle(pKey);
                }}
                href={`/project/${encodeURIComponent(project.name)}`}
                icon={ProjectIcon}
                text={project.name}
                current={
                  currentBranchQuery === null &&
                  currentPath === `/project/${encodeURIComponent(project.name)}`
                }
                onNavigate={closeSidebar}
                language={language}
              />
              {projectOpen && (
                <>
                  {query === "" &&
                    project.branches.some((b) => b.latestEventHash !== "") && (
                      <AddRow
                        level="branch"
                        href={`/project/${encodeURIComponent(project.name)}?add=branch`}
                        text={addLabel(
                          "Add branch",
                          "ブランチの追加",
                          "Aldoni branĉon",
                        )}
                        onNavigate={closeSidebar}
                      />
                    )}
                  {project.branches.map((branch) => {
                    const bKey = branchKey(project.name, branch.name);
                    const cKey = commitKey(project.name, branch.name);
                    const branchOpen =
                      query !== "" || isOpen(bKey, branch.displayed);
                    const commitOpen =
                      query !== "" || isOpen(cKey, branch.displayed);
                    const commit = branch.commit;
                    const onNavigate = navigateIn(project.name, branch.name);
                    // ブランチにコミットできるのは作成者だけなので, 中の「追加」は自分のブランチ
                    // (とまだコミットの無い新しいプロジェクト) にだけ出す. ブランチの追加は誰でもできる
                    const canEdit =
                      query === "" &&
                      (branch.creatorAccountId === null ||
                        branch.creatorAccountId === currentAccount?.accountId);
                    const branchModules =
                      commit?.modules
                        .map((mod) => ({
                          ...mod,
                          shownParts:
                            query === ""
                              ? mod.parts
                              : mod.parts.filter((part) =>
                                  matchesQuery(mod.name, part.name),
                                ),
                        }))
                        .filter(
                          (mod) => query === "" || mod.shownParts.length > 0,
                        ) ?? [];
                    if (query !== "" && branchModules.length === 0) {
                      return null;
                    }
                    return (
                      <div key={branch.name} className="sidebar-branch-group">
                        <TreeRow
                          level="branch"
                          open={branchOpen}
                          onToggle={() => {
                            toggle(bKey);
                          }}
                          href={`/project/${encodeURIComponent(project.name)}?branch=${encodeURIComponent(branch.name)}`}
                          icon={BranchIcon}
                          text={branch.name}
                          current={
                            currentBranchQuery === branch.name &&
                            currentPath ===
                              `/project/${encodeURIComponent(project.name)}`
                          }
                          detail={
                            branch.creatorAccountId === null ||
                            branch.creatorAccountId === ""
                              ? undefined
                              : (accountNames.get(branch.creatorAccountId) ??
                                branch.creatorAccountId.slice(0, 8))
                          }
                          badge={
                            branch.displayed
                              ? label(language, "shown", "表示中", "montrata")
                              : undefined
                          }
                          onNavigate={onNavigate}
                          language={language}
                        />
                        {branchOpen && (
                          <>
                            {canEdit && (
                              <AddRow
                                level="commit"
                                href={CHANGES_ONLY_HREF}
                                text={addLabel(
                                  "Add commit",
                                  "コミットの追加",
                                  "Aldoni enmeton",
                                )}
                                onNavigate={onNavigate}
                              />
                            )}
                            {commit === null ? (
                              <div
                                className="sidebar-tree-loading"
                                data-level="commit"
                              >
                                {label(
                                  language,
                                  "Loading...",
                                  "読み込み中...",
                                  "Ŝargante...",
                                )}
                              </div>
                            ) : (
                              <div className="sidebar-commit-group">
                                <TreeRow
                                  level="commit"
                                  open={commitOpen}
                                  onToggle={() => {
                                    toggle(cKey);
                                  }}
                                  href={
                                    commit.eventHash === ""
                                      ? CHANGES_ONLY_HREF
                                      : `/event/${commit.eventHash}`
                                  }
                                  icon={CommitIcon}
                                  current={
                                    commit.eventHash !== "" &&
                                    currentPath === `/event/${commit.eventHash}`
                                  }
                                  text={
                                    commit.eventHash === ""
                                      ? label(
                                          language,
                                          "Not committed",
                                          "未コミット",
                                          "Neenmetita",
                                        )
                                      : commit.eventHash.slice(0, 8)
                                  }
                                  mono={commit.eventHash !== ""}
                                  detail={commit.message}
                                  onNavigate={closeSidebar}
                                  language={language}
                                />
                                {commitOpen && (
                                  <>
                                    {canEdit && (
                                      <AddRow
                                        level="module"
                                        href={`/new-part?project=${encodeURIComponent(project.name)}`}
                                        text={addLabel(
                                          "Add module",
                                          "モジュールの追加",
                                          "Aldoni modulon",
                                        )}
                                        onNavigate={onNavigate}
                                      />
                                    )}
                                    {branchModules.map((mod) => {
                                      const mKey = moduleKey(
                                        project.name,
                                        branch.name,
                                        mod.name,
                                      );
                                      const moduleOpen =
                                        query !== "" ||
                                        isOpen(mKey, branch.displayed);
                                      const moduleTypeErrorCount =
                                        branch.displayed
                                          ? mod.parts.filter(
                                              (p) => typeErrorOf(p) !== null,
                                            ).length
                                          : 0;
                                      return (
                                        <div
                                          key={mod.name}
                                          className="sidebar-module-group"
                                        >
                                          <TreeRow
                                            level="module"
                                            open={moduleOpen}
                                            onToggle={() => {
                                              toggle(mKey);
                                            }}
                                            href={`/module/${encodeURIComponent(mod.name)}`}
                                            icon={ModuleIcon}
                                            text={mod.name}
                                            current={
                                              branch.displayed &&
                                              currentPath ===
                                                `/module/${encodeURIComponent(mod.name)}`
                                            }
                                            typeErrorCount={
                                              moduleTypeErrorCount
                                            }
                                            count={mod.parts.length}
                                            onNavigate={onNavigate}
                                            language={language}
                                          />
                                          {moduleOpen && (
                                            <div className="sidebar-module-parts">
                                              {canEdit && (
                                                <AddRow
                                                  level="part"
                                                  href={`/new-part?module=${encodeURIComponent(mod.name)}`}
                                                  text={addLabel(
                                                    "Add part",
                                                    "パーツの追加",
                                                    "Aldoni parton",
                                                  )}
                                                  onNavigate={onNavigate}
                                                />
                                              )}
                                              {mod.shownParts.map((part) => {
                                                // 作業中の変更は表示しているブランチに重ねている
                                                const change = branch.displayed
                                                  ? workingChanges.parts.get(
                                                      part.partId,
                                                    )
                                                  : undefined;
                                                return (
                                                  <PartNode
                                                    key={part.partId}
                                                    partId={part.partId}
                                                    name={
                                                      change?.name ?? part.name
                                                    }
                                                    deleted={
                                                      change?.deleted === true
                                                    }
                                                    isChanged={
                                                      change !== undefined
                                                    }
                                                    typeError={
                                                      branch.displayed
                                                        ? typeErrorOf(part)
                                                        : null
                                                    }
                                                    isSelected={
                                                      branch.displayed &&
                                                      part.partId ===
                                                        selectedPartId
                                                    }
                                                    onNavigate={
                                                      branch.displayed
                                                        ? closeSidebar
                                                        : onNavigate
                                                    }
                                                  />
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
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

/**
 * 木の 1 行. 左の ›/⌄ で開閉し, 名前はその段の詳細のページへのリンク
 */
function TreeRow({
  level,
  open,
  onToggle,
  href,
  icon: Icon,
  text,
  mono = false,
  detail,
  badge,
  current = false,
  typeErrorCount = 0,
  count,
  onNavigate,
  language,
}: {
  readonly level: TreeLevel;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly href: string;
  readonly icon: IconComponent;
  readonly text: string;
  readonly mono?: boolean;
  /** 名前の後ろに薄く出す補足 (ブランチの作成者, コミットのメッセージ) */
  readonly detail?: string | undefined;
  readonly badge?: string | undefined;
  readonly current?: boolean;
  readonly typeErrorCount?: number;
  readonly count?: number;
  readonly onNavigate: () => void;
  readonly language: LanguageCode;
}): JSX.Element {
  const toggleLabel = open
    ? label(language, "Collapse", "閉じる", "Faldi")
    : label(language, "Expand", "開く", "Malfaldi");
  return (
    <div className="sidebar-tree-row" data-level={level}>
      <button
        type="button"
        className="sidebar-tree-toggle"
        aria-expanded={open}
        aria-label={`${toggleLabel}: ${text}`}
        title={toggleLabel}
        onClick={onToggle}
      >
        <ChevronRightIcon
          size={14}
          className={`sidebar-chevron ${open ? "expanded" : ""}`}
        />
      </button>
      <Link
        href={href}
        className={`sidebar-tree-node ${level}-node`}
        aria-current={current ? "page" : undefined}
        onClick={onNavigate}
        title={
          detail === undefined || detail === "" ? text : `${text} — ${detail}`
        }
      >
        <Icon size={15} className={`sidebar-node-icon tree-icon-${level}`} />
        <span className={`sidebar-node-label ${mono ? "font-mono" : ""}`}>
          {text}
        </span>
        {detail !== undefined && detail !== "" && (
          <span className="sidebar-node-detail">{detail}</span>
        )}
        {badge !== undefined && <span className="sidebar-branch">{badge}</span>}
        {typeErrorCount > 0 && (
          <span
            className="sidebar-type-error-count"
            title={label(
              language,
              `${typeErrorCount} parts with type errors`,
              `型エラーのあるパーツ ${typeErrorCount} 件`,
              `${typeErrorCount} partoj kun tiperaroj`,
            )}
          >
            {typeErrorCount}
          </span>
        )}
        {count !== undefined && <span className="sidebar-count">{count}</span>}
      </Link>
    </div>
  );
}

/** 各段の先頭の「+ ○○の追加」. `level` はその段 (追加するものの段) */
function AddRow({
  level,
  href,
  text,
  onNavigate,
}: {
  readonly level: TreeLevel;
  readonly href: string;
  readonly text: string;
  readonly onNavigate: () => void;
}): JSX.Element {
  return (
    <div className="sidebar-tree-row sidebar-add-row" data-level={level}>
      <span className="sidebar-tree-toggle-spacer" />
      <Link
        href={href}
        className="sidebar-tree-node sidebar-add-node"
        data-add={level}
        onClick={onNavigate}
      >
        <span className="sidebar-add-icon" aria-hidden="true">
          +
        </span>
        <span className="sidebar-node-label">{text}</span>
      </Link>
    </div>
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
    <div className="sidebar-tree-row" data-level="part">
      <span className="sidebar-tree-toggle-spacer" />
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
    </div>
  );
});
