import React from "https://esm.sh/react@18.2.0?pin=v99";
import { namespaceToString } from "../../definyRpc/codeGen/namespace.ts";
import { FunctionDetail } from "../../definyRpc/core/coreType.ts";

export const GeneratedNodeForm = (
  props: { readonly functionDetail: FunctionDetail },
): React.ReactElement => {
  return (
    <div>
      <h2>{props.functionDetail.name}</h2>
      <div>{props.functionDetail.description}</div>
      <div>
        input: {namespaceToString(props.functionDetail.input.namespace) + "." +
          props.functionDetail.input.name}
      </div>
      <div>
        output:{" "}
        {namespaceToString(props.functionDetail.output.namespace) + "." +
          props.functionDetail.output.name}
      </div>
    </div>
  );
};
