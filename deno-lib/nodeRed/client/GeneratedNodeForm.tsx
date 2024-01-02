import React from "https://esm.sh/react@18.2.0?pin=v135";
import { TypeView } from "../../definyRpc/clientEditor/DetailView.tsx";
import {
  DefinyRpcTypeInfo,
  FunctionDetail,
} from "../../definyRpc/core/coreType.ts";

export const GeneratedNodeForm = (
  props: {
    readonly functionDetail: FunctionDetail;
    readonly typeList: ReadonlyArray<DefinyRpcTypeInfo>;
  },
): React.ReactElement => {
  return (
    <div>
      <h2>{props.functionDetail.name}</h2>
      <div>{props.functionDetail.description}</div>
      <div>
        input: {
          <TypeView
            type={props.functionDetail.input}
            typeList={props.typeList}
          />
        }
      </div>
      <div>
        output: {
          <TypeView
            type={props.functionDetail.output}
            typeList={props.typeList}
          />
        }
      </div>
    </div>
  );
};
