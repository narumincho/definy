import { titleHead } from "../../src/page_head.ts";

// アカウント名はクライアントで取得するデータから決まるので, ここでは仮のタイトルにして
// ページのコンポーネントの usePageTitle でアカウント名に置き換える
export const head = titleHead("Account", "アカウント", "Konto");
