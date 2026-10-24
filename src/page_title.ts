import { useEffect } from "react";
import { useNavigation } from "@void/react";

const SITE_NAME = "definy";

/** ページ名からタブに出すタイトルを作る. ページ名が無ければサイト名だけ */
export function pageTitle(pageName: string | null): string {
  return pageName === null || pageName === ""
    ? SITE_NAME
    : `${pageName} | ${SITE_NAME}`;
}

/**
 * 開いているページの名前を document.title に反映する.
 *
 * Void はクライアント側の遷移で新しいページを描画したあと void.json の head.title ("definy") を
 * document.title に入れ直すため, 描画時の useEffect だけだと上書きされる.
 * 遷移が終わる (navigation.state が idle に戻る) たびにもう一度設定する.
 */
export function usePageTitle(pageName: string | null): void {
  const navigationState = useNavigation().state;
  const title = pageTitle(pageName);
  useEffect(() => {
    if (navigationState !== "idle") {
      return;
    }
    document.title = title;
  }, [title, navigationState]);
}
