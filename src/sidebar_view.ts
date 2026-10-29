/**
 * 左端のアクティビティバーで選ぶ欄 (docs/ui.md「ワークベンチ」). アクティビティバー → サイドバー → エディタ領域 の順に
 * 左から階層になるよう, サイドバーの中身は今のページのパスから決める
 */
export type SidebarView = "events" | "projects" | "accounts" | "settings";

/**
 * イベント詳細 (`/event/...`) は「イベント」の一覧からもプロジェクトの木のコミットからも開くので `null` (前の欄のまま).
 * 最初に開いたページがイベント詳細なら「イベント」にする (`useUiState`)
 */
export function sidebarViewOf(path: string): SidebarView | null {
  if (path === "/") return "events";
  if (path.startsWith("/event/")) return null;
  if (path === "/accounts" || path.startsWith("/account/")) return "accounts";
  if (path.startsWith("/settings") || path.startsWith("/about")) {
    return "settings";
  }
  return "projects";
}
