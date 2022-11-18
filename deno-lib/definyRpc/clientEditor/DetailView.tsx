import React from "https://esm.sh/react@18.2.0";
import { FunctionDetail } from "../client/generated/definyRpc.ts";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";

const containerStyle = toStyleAndHash({
  overflowWrap: "anywhere",
});

export const DetailView = (props: {
  readonly functionList: ReadonlyArray<FunctionDetail>;
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
    <div className={c(containerStyle)}>
      <h2>{selectedFuncDetail.name.join(".")}</h2>
      <div>{selectedFuncDetail.description}</div>
      <div>入力 input: {selectedFuncDetail.input.fullName.join(".")}</div>
      <div>出力 output: {selectedFuncDetail.output.fullName.join(".")}</div>
    </div>
  );
};