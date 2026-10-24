import { titleHead } from "../../src/page_head.ts";

// パーツ名はクライアントで取得するデータから決まるので, ここでは仮のタイトルにして
// ページのコンポーネントの usePageTitle で `モジュール名.パーツ名` に置き換える
export const head = titleHead("Part", "パーツ", "Parto");
