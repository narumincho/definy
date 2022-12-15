import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { FunctionDetail, Type } from "../core/coreType.ts";
import {
  functionNamespaceToString,
  namespaceToString,
} from "../codeGen/namespace.ts";

const containerStyle = toStyleAndHash({
  overflowWrap: "anywhere",
});

const box = toStyleAndHash({
  padding: 8,
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
        入力 input:
        <TypeView type={selectedFuncDetail.input} />
      </div>
      <div>
        出力 output:
        <TypeView type={selectedFuncDetail.output} />
      </div>
    </div>
  );
};

export const TypeView = <T extends unknown>(
  props: { readonly type: Type<T> },
): React.ReactElement => {
  return (
    <div className={c(box)}>
      <div>
        {namespaceToString(props.type.namespace) + "." + props.type.name}
      </div>
      <div className={c(box)}>
        {props.type.parameters.map((parameter, index) => (
          <TypeView
            key={index}
            type={parameter}
          />
        ))}
      </div>
    </div>
  );
};
