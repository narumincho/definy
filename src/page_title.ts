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
 * サーバーでは分からない名前 (クライアントで取得したデータから決まるパーツ名・モジュール名) を document.title に反映する.
 * サーバーで決まるタイトルはページの `.server.ts` の head() (src/page_head.ts) で設定する.
 *
 * Void はクライアント側の遷移で新しいページを描画したあと, head() のタイトルを document.title に入れ直すため,
 * 描画時の useEffect だけだと上書きされる. 遷移が終わる (navigation.state が idle に戻る) たびにもう一度設定する.
 */
export function usePageTitle(pageName: string): void {
  const navigationState = useNavigation().state;
  const title = pageTitle(pageName);
  useEffect(() => {
    if (navigationState !== "idle") {
      return;
    }
    document.title = title;
  }, [title, navigationState]);
}
