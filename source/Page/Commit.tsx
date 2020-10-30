import * as d from "definy-core/source/data";
import { VNode, h } from "maquette";
import { Model } from "../model";

export const Commit = (prop: { model: Model; commitId: d.CommitId }): VNode =>
  h("div", { class: "commit-editor__root" }, [
    h("div", {}, ["コミットの詳細, 編集ページ"]),
    h("div", {}, ["入力エリア. 選択したものの評価した値や, 選択の候補が出る"]),
  ]);
