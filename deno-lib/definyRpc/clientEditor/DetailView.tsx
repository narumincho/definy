import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { FunctionDetail } from "../core/coreType.ts";
import {
  functionNamespaceToString,
  namespaceToString,
} from "../codeGen/namespace.ts";

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
    (func) =>
      functionNamespaceToString(func.namespace) + "." + func.name ===
        props.selectedFuncName,
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
      <div>{functionNamespaceToString(selectedFuncDetail.namespace)}</div>
      <h2>{selectedFuncDetail.name}</h2>
      <div>{selectedFuncDetail.description}</div>
      <div>
        入力 input: {namespaceToString(selectedFuncDetail.input.namespace) + "." +
          selectedFuncDetail.input.name}
      </div>
      <div>
        出力 output:{" "}
        {namespaceToString(selectedFuncDetail.output.namespace) + "." +
          selectedFuncDetail.output.name}
      </div>
    </div>
  );
};
