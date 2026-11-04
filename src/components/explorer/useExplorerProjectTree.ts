import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useRouter } from "@void/react";
import { useDefiny } from "../../state.tsx";
import { withNewParts } from "../../new_part.ts";
import { MAIN_BRANCH } from "../../event_content.ts";
import {
  buildExplorerTree,
  type ExplorerPart,
  type ExplorerProject,
} from "../../explorer_tree.ts";
import type { LanguageCode, WorkingChanges } from "../../types.ts";
import {
  branchKey,
  commitKey,
  moduleKey,
  partIdFromPath,
  projectKey,
} from "./tree_keys.ts";

/** 木の各段が使う, 木全体で共通のもの */
export type TreeControls = {
  readonly language: LanguageCode;
  /** 絞り込みの文字列 (小文字にして前後の空白を除いたもの). 空なら絞り込まない */
  readonly query: string;
  readonly matchesQuery: (moduleName: string, partName: string) => boolean;
  /** 開閉のキーのノードが開いているか. `defaultOpen` は切り替えていないときの開閉 */
  readonly isOpen: (key: string, defaultOpen: boolean) => boolean;
  readonly toggle: (key: string) => void;
  /** 狭い画面のドロワーを閉じる (広い画面では何も変わらない) */
  readonly closeSidebar: () => void;
  /** 表示していないブランチの中のリンクは, そのブランチを表示してから開く */
  readonly navigateIn: (projectName: string, branch: string) => () => void;
  readonly currentPath: string;
  /** 今のページの `?branch=` */
  readonly currentBranchQuery: string | null;
  /** パーツの型エラーの理由. 無ければ `null` */
  readonly typeErrorOf: (part: ExplorerPart) => string | null;
  readonly selectedPartId: string | undefined;
  readonly workingChanges: WorkingChanges;
  readonly accountNames: ReadonlyMap<string, string>;
  readonly currentAccountId: string | undefined;
};

/**
 * エクスプローラーのプロジェクトの木 (プロジェクト ▸ ブランチ ▸ コミット ▸ モジュール ▸ パーツ. src/explorer_tree.ts) と開閉の状態.
 * 開いているパーツが変わったら, そのパーツが見えるように上の段を開いて `scrollRef` の中でスクロールする.
 * 開いたブランチの最新のコミットをまだ読んでいなければ読む
 */
export function useExplorerProjectTree({
  filterQuery,
  scrollRef,
}: {
  readonly filterQuery: string;
  readonly scrollRef: RefObject<HTMLDivElement | null>;
}): {
  readonly tree: ReadonlyArray<ExplorerProject>;
  readonly controls: TreeControls;
} {
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
  const typeErrorOf = (part: ExplorerPart): string | null => {
    const outcome =
      part.partIdHash === null
        ? undefined
        : partTypeCheckResults.get(part.partIdHash);
    return outcome === undefined || outcome.kind === "unsupported"
      ? null
      : typeCheckMessage(part.partId, outcome);
  };
  // 既定の開閉 (表示しているブランチとその中身は開く, 他のブランチは閉じる) から切り替えたノード
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());
  const isOpen = (key: string, defaultOpen: boolean): boolean =>
    defaultOpen !== toggled.has(key);
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

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const navigateIn = (projectName: string, branch: string): (() => void) => {
    return () => {
      selectBranch(projectName, branch);
      closeSidebar();
    };
  };

  // 開いたブランチの最新のコミットをまだ読んでいなければ読む (中のモジュール・パーツを出すため)
  const unloadedKey = tree
    .flatMap((project) =>
      isOpen(projectKey(project.name), true)
        ? project.branches.filter(
            (branch) =>
              branch.commit === null &&
              branch.latestEventHash !== "" &&
              isOpen(branchKey(project.name, branch.name), branch.displayed),
          )
        : [],
    )
    .map((branch) => branch.latestEventHash)
    .join(",");
  useEffect(() => {
    for (const hash of unloadedKey === "" ? [] : unloadedKey.split(",")) {
      void loadEvent(hash);
    }
  }, [unloadedKey, loadEvent]);

  const controls: TreeControls = {
    language,
    query,
    matchesQuery,
    isOpen,
    toggle,
    closeSidebar,
    navigateIn,
    currentPath,
    currentBranchQuery,
    typeErrorOf,
    selectedPartId,
    workingChanges,
    accountNames,
    currentAccountId: currentAccount?.accountId,
  };

  return { tree, controls };
}
