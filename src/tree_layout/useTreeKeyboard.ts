import { useCallback, type KeyboardEvent, type RefObject } from "react";
import { isSamePath, pathToString, type PathStep } from "./types.ts";
import {
  isTextInput,
  navigate,
  navKeyFromEvent,
  TREE_INTERCEPT_KEYS,
  type NavKey,
  type NavNode,
} from "./keyboard.ts";

export type UseTreeKeyboardParams = {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly selectedPath: ReadonlyArray<PathStep> | null;
  readonly setSelectedPath: (path: ReadonlyArray<PathStep> | null) => void;
  readonly nodeIndex: ReadonlyArray<{
    readonly id: string;
    readonly path: ReadonlyArray<PathStep>;
  }>;
  readonly isMenuOpen: boolean;
  readonly onExit?: ((key: NavKey) => void) | undefined;
  readonly openMenu: (path: ReadonlyArray<PathStep>) => void;
  readonly closeMenu: () => void;
  readonly handleClear: (path: ReadonlyArray<PathStep>) => void;
  readonly setInlineEdit: (inline: boolean) => void;
};

export type TreeKeyboardOperations = {
  readonly focusContainer: () => void;
  readonly returnToTree: () => void;
  readonly handleContainerKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  readonly scrollNodeIntoView: (path: ReadonlyArray<PathStep>) => void;
};

export function useTreeKeyboard({
  containerRef,
  selectedPath,
  setSelectedPath,
  nodeIndex,
  isMenuOpen,
  onExit,
  openMenu,
  closeMenu,
  handleClear,
  setInlineEdit,
}: UseTreeKeyboardParams): TreeKeyboardOperations {
  const focusContainer = useCallback((): void => {
    containerRef.current?.focus({ preventScroll: true });
  }, [containerRef]);

  const returnToTree = useCallback((): void => {
    closeMenu();
    setInlineEdit(false);
    focusContainer();
  }, [closeMenu, focusContainer, setInlineEdit]);

  const scrollNodeIntoView = useCallback(
    (path: ReadonlyArray<PathStep>): void => {
      const id = nodeIndex.find((n) => isSamePath(n.path, path))?.id;
      if (id === undefined) return;
      containerRef.current
        ?.querySelector(`[data-node-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    [containerRef, nodeIndex],
  );

  const collectNavNodes = useCallback((): ReadonlyArray<NavNode> => {
    const container = containerRef.current;
    if (!container) return [];
    const pathById = new Map(nodeIndex.map((n) => [n.id, n.path]));
    const seen = new Set<string>();
    const nodes: NavNode[] = [];
    for (const element of container.querySelectorAll<HTMLElement>(
      "[data-node-id]",
    )) {
      const path = pathById.get(element.dataset.nodeId ?? "");
      if (path === undefined) continue;
      const key = pathToString(path);
      if (seen.has(key)) continue;
      seen.add(key);
      const r = element.getBoundingClientRect();
      nodes.push({
        path,
        rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      });
    }
    return nodes;
  }, [containerRef, nodeIndex]);

  const exitTree = useCallback(
    (key: NavKey): void => {
      closeMenu();
      setSelectedPath(null);
      onExit?.(key);
    },
    [closeMenu, onExit, setSelectedPath],
  );

  const handleContainerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      const navKey = navKeyFromEvent(e);
      // このツリーで処理したキーは外側 (パーツ定義のツリーなど) に二重に処理させない
      if (navKey !== null || TREE_INTERCEPT_KEYS.has(e.key)) {
        e.stopPropagation();
      }

      if (isTextInput(e.target)) {
        // 入力欄を抜けたらツリーにフォーカスを戻し, 続けてキーで移動できるようにする
        if (e.key === "Escape" || e.key === "Enter") {
          e.preventDefault();
          returnToTree();
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        openMenu(selectedPath ?? nodeIndex[0]?.path ?? []);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // 何も選んでいないときの Escape はツリーの外へ戻る
        if (selectedPath === null) {
          exitTree("parent");
        } else {
          closeMenu();
          setSelectedPath(null);
        }
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedPath) {
        e.preventDefault();
        handleClear(selectedPath);
        return;
      }
      if (navKey === null) return;
      e.preventDefault();
      const next = navigate(collectNavNodes(), selectedPath, navKey);
      if (next === null) {
        // ルートより上・ツリーの端より先へは, 外側に移動を任せる
        const leavesTree =
          navKey === "up" ||
          navKey === "down" ||
          ((navKey === "parent" || navKey === "root") &&
            selectedPath !== null &&
            selectedPath.length === 0);
        if (leavesTree && onExit) {
          exitTree(navKey);
        }
        return;
      }
      closeMenu();
      setInlineEdit(false);
      setSelectedPath(next);
      scrollNodeIntoView(next);
    },
    [
      closeMenu,
      collectNavNodes,
      exitTree,
      handleClear,
      nodeIndex,
      onExit,
      openMenu,
      returnToTree,
      scrollNodeIntoView,
      selectedPath,
      setInlineEdit,
      setSelectedPath,
    ],
  );

  return {
    focusContainer,
    returnToTree,
    handleContainerKeyDown,
    scrollNodeIntoView,
  };
}
