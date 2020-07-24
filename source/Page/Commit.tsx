import * as React from "react";
import { CommitId } from "definy-core/source/data";
import { Model } from "../model";
import styled from "styled-components";

const CommitDiv = styled.div({
  display: "grid",
  gridTemplateRows: "1fr 200px",
});

export const Commit: React.FC<{ model: Model; commitId: CommitId }> = (
  prop
) => {
  return (
    <CommitDiv>
      <div>コミットの詳細, 編集ページ</div>
      <div>入力エリア. 選択したものの評価した値や, 選択の候補が出る</div>
    </CommitDiv>
  );
};
