import { useCallback, useState } from "react";
import { useRouter } from "@void/react";
import { parseLanguageCode, withLanguage } from "../language.ts";
import type { LanguageCode } from "../types.ts";

export type UiState = {
  readonly language: LanguageCode;
  readonly setLanguage: (lang: LanguageCode) => void;
  /**
   * 狭い画面 (スマホ) でエクスプローラーのドロワーを開いているか. 広い画面のエクスプローラーは常に出ているので使わない.
   * SSR と揃えるため閉じた状態から始める (開いた状態で描画してから閉じると, 読み込みのたびにドロワーが一瞬見える)
   */
  readonly sidebarOpen: boolean;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly commandPaletteOpen: boolean;
  readonly setCommandPaletteOpen: (open: boolean) => void;
  readonly accountModalOpen: boolean;
  readonly setAccountModalOpen: (open: boolean) => void;
};

export function useUiState(): UiState {
  // 表示言語は URL の ?lang= だけで決める (localStorage などには保存しない).
  // ?lang= が無いページの要求はミドルウェアが Accept-Language から決めた ?lang= 付きの URL にリダイレクトするので,
  // en になるのは ?lang= が壊れているときだけ. SSR でも Void Router から読めるのでハイドレーション不一致も起きない
  const router = useRouter();
  const language = parseLanguageCode(router.query.get("lang")) ?? "en";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

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

  return {
    language,
    setLanguage,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    commandPaletteOpen,
    setCommandPaletteOpen,
    accountModalOpen,
    setAccountModalOpen,
  };
}
