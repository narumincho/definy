import React from "https://esm.sh/react@18.2.0";
import { FunctionDetail } from "../../definyRpc/client/generated/definyRpc.ts";

export const GeneratedNodeForm = (
  props: { functionDetail: FunctionDetail },
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
