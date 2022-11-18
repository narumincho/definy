import { React } from "../../deps.ts";
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
