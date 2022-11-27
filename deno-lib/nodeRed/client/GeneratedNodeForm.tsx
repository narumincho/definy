import React from "https://esm.sh/react@18.2.0?pin=v99";
import { jsx } from "https://esm.sh/@emotion/react@11.10.5?pin=v99";
import { FunctionDetail } from "../../definyRpc/generated/definyRpc.ts";

export const GeneratedNodeForm = (
  props: { readonly functionDetail: FunctionDetail },
): React.ReactElement => {
  return (
    <div>
      <h2>{props.functionDetail.name}</h2>
      <div>{props.functionDetail.description}</div>
      <div>input: {props.functionDetail.input.fullName.join(".")}</div>
      <div>output: {props.functionDetail.output.fullName.join(".")}</div>
    </div>
  );
};
