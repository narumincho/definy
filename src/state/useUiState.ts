import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@void/react";
import type { LanguageCode } from "../types.ts";

const STORAGE_KEY_LANG = "definy.language";

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === "en" || value === "ja" || value === "eo";
}

/**
 * URL クエリ (?lang=) が無いときにブラウザ側の情報から言語を決める。
 * 優先順位は localStorage > navigator.language > en。
 * SSR とのハイドレーション不一致を避けるため、マウント後の useEffect からのみ呼ぶ。
 */
function resolveBrowserLanguage(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY_LANG);
  if (isLanguageCode(stored)) return stored;
  if (navigator.language.startsWith("ja")) return "ja";
  if (navigator.language.startsWith("eo")) return "eo";
  return "en";
}

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
  // ?lang= は SSR でも Void Router 経由で読めるので初期値に使う。
  // localStorage など SSR で読めない値はマウント後に反映し、初回レンダーを SSR と揃える。
  const queryLang = useRouter().query.get("lang");
  const queryLanguage = isLanguageCode(queryLang) ? queryLang : null;
  const [language, setLanguageState] = useState<LanguageCode>(
    queryLanguage ?? "en",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  useEffect(() => {
    if (queryLanguage === null) {
      setLanguageState(resolveBrowserLanguage());
    }
  }, [queryLanguage]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", lang);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

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
