import { titleHead } from "../../src/page_head.ts";

// プロジェクト名はクライアントで取得するデータから決まるので, ここでは仮のタイトルにして
// ページのコンポーネントの usePageTitle でプロジェクト名に置き換える
export const head = titleHead("Project", "プロジェクト", "Projekto");
