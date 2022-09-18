import * as React from "react";
import { FuncDetail } from "./FuncDetail";

export const DetailView = (props: {
  readonly functionList: ReadonlyArray<FuncDetail>;
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
      <div>{JSON.stringify(selectedFuncDetail.input)}</div>
    </div>
  );
};
