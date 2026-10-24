import { titleHead } from "../../src/page_head.ts";

// モジュール名はクライアントで取得するデータから決まるので, ここでは仮のタイトルにして
// ページのコンポーネントの usePageTitle でモジュール名に置き換える
export const head = titleHead("Module", "モジュール", "Modulo");
