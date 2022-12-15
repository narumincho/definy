import React from "https://esm.sh/react@18.2.0?pin=v99";
import { TypeView } from "../../definyRpc/clientEditor/DetailView.tsx";
import { namespaceToString } from "../../definyRpc/codeGen/namespace.ts";
import { FunctionDetail } from "../../definyRpc/core/coreType.ts";

export const GeneratedNodeForm = (
  props: { readonly functionDetail: FunctionDetail },
): React.ReactElement => {
  return (
    <div>
      <h2>{props.functionDetail.name}</h2>
      <div>{props.functionDetail.description}</div>
      <div>input: {<TypeView type={props.functionDetail.input} />}</div>
      <div>output: {<TypeView type={props.functionDetail.output} />}</div>
    </div>
  );
};
