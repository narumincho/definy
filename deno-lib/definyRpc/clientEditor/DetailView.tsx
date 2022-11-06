/* @jsx jsx */

import React from "https://esm.sh/react@18.2.0";
import * as definyRpc from "./definyRpc.ts";
import { jsx } from "https://esm.sh/@emotion/react@11.10.5";

export const DetailView = (props: {
  readonly functionList: ReadonlyArray<definyRpc.FunctionDetail>;
  readonly selectedFuncName: string | undefined;
}): React.ReactElement => {
  if (props.selectedFuncName === undefined) {
    return (
      <div>
        <h2>未選択</h2>
      </div>
    );
  }
  const selectedFuncDetail = props.functionList.find(
    (func) => func.name.join(".") === props.selectedFuncName
  );

  if (selectedFuncDetail === undefined) {
    return (
      <div>
        <h2>不明な関数</h2>
      </div>
    );
  }
  return (
    <div css={{ overflowWrap: "anywhere" }}>
      <h2>{selectedFuncDetail.name.join(".")}</h2>
      <div>{selectedFuncDetail.description}</div>
      <div>入力 input: {selectedFuncDetail.input.fullName.join(".")}</div>
      <div>出力 output: {selectedFuncDetail.output.fullName.join(".")}</div>
    </div>
  );
};
