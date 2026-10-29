import { useCallback, useState } from "react";
import { useRouter } from "@void/react";
import { parseLanguageCode, withLanguage } from "../language.ts";
import type { LanguageCode } from "../types.ts";
import { sidebarViewOf, type SidebarView } from "../sidebar_view.ts";

/** ページ (パーツ詳細など) が持つ元に戻す (Undo) / やり直す (Redo). ヘッダーのボタンから使う */
export type PageUndoControls = {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undo: () => void;
  readonly redo: () => void;
};

export type UiState = {
  readonly language: LanguageCode;
  readonly setLanguage: (lang: LanguageCode) => void;
  /**
   * 狭い画面 (スマホ) でエクスプローラーのドロワーを開いているか. 広い画面のエクスプローラーは常に出ているので使わない.
   * SSR と揃えるため閉じた状態から始める (開いた状態で描画してから閉じると, 読み込みのたびにドロワーが一瞬見える)
   */
  readonly sidebarOpen: boolean;
  /** 左端のアクティビティバーで選んでいる, サイドバーの欄 (src/sidebar_view.ts) */
  readonly sidebarView: SidebarView;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly commandPaletteOpen: boolean;
  readonly setCommandPaletteOpen: (open: boolean) => void;
  /** ショートカットキー一覧 (docs/key.md) を出しているか. Cmd / Ctrl + / とコマンドパレットから開く */
  readonly shortcutListOpen: boolean;
  readonly setShortcutListOpen: (open: boolean) => void;
  readonly accountModalOpen: boolean;
  readonly setAccountModalOpen: (open: boolean) => void;
  /** 実行パネル (docs/run-panel.md) を出しているか. どのページでも出したままにできる */
  readonly runPanelOpen: boolean;
  readonly setRunPanelOpen: (open: boolean) => void;
  readonly toggleRunPanel: () => void;
  /** 今のページの Undo / Redo. 持たないページでは `null` (ヘッダーのボタンは押せない) */
  readonly pageUndo: PageUndoControls | null;
  readonly setPageUndo: (controls: PageUndoControls | null) => void;
};

export function useUiState(): UiState {
  // 表示言語は URL の ?lang= だけで決める (localStorage などには保存しない).
  // ?lang= が無いページの要求はミドルウェアが Accept-Language から決めた ?lang= 付きの URL にリダイレクトするので,
  // en になるのは ?lang= が壊れているときだけ. SSR でも Void Router から読めるのでハイドレーション不一致も起きない
  const router = useRouter();
  const language = parseLanguageCode(router.query.get("lang")) ?? "en";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // イベント詳細は前の欄のまま (プロジェクトの木のコミットから開いたら木を出したまま) にするので, 最後の欄を覚えておく
  const pathView = sidebarViewOf(router.path);
  const [lastView, setLastView] = useState<SidebarView>(pathView ?? "events");
  if (pathView !== null && pathView !== lastView) {
    setLastView(pathView);
  }
  const sidebarView = pathView ?? lastView;
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutListOpen, setShortcutListOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [pageUndo, setPageUndo] = useState<PageUndoControls | null>(null);

  const setLanguage = useCallback(
    (lang: LanguageCode) => {
      const current = router.url;
      router.visit(
        withLanguage(current.pathname + current.search + current.hash, lang),
        { replace: true, preserveState: true, preserveScroll: true },
      );
    },
    [router],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleRunPanel = useCallback(() => {
    setRunPanelOpen((prev) => !prev);
  }, []);

  return {
    language,
    setLanguage,
    sidebarOpen,
    sidebarView,
    toggleSidebar,
    setSidebarOpen,
    commandPaletteOpen,
    setCommandPaletteOpen,
    shortcutListOpen,
    setShortcutListOpen,
    accountModalOpen,
    setAccountModalOpen,
    runPanelOpen,
    setRunPanelOpen,
    toggleRunPanel,
    pageUndo,
    setPageUndo,
  };
}
