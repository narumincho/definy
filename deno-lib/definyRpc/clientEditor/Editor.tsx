import React from "https://esm.sh/react@18.2.0?pin=v99";
import { Button } from "../../editor/Button.tsx";
import { DetailView } from "./DetailView.tsx";
import { Result } from "./Result.tsx";
import { Select } from "./Select.tsx";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { RawJsonValue } from "../../typedJson.ts";
import {
  DefinyRpcTypeInfo,
  FunctionDetail,
  StructuredJsonValue,
} from "../core/coreType.ts";
import {
  functionNamespaceToString,
  namespaceToString,
} from "../codeGen/namespace.ts";
import { requestQuery } from "../core/request.ts";
import { coreTypeInfoList } from "../core/coreTypeInfo.ts";

const containerStyle = toStyleAndHash({
  padding: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
});

const contentStyle = toStyleAndHash({
  display: "grid",
  alignContent: "start",
});

export type FunctionAndTypeList = {
  readonly funcList: ReadonlyArray<FunctionDetail>;
  readonly typeList: ReadonlyArray<DefinyRpcTypeInfo>;
};

export const Editor = (props: {
  readonly serverOrigin: string;
  readonly functionAndTypeList: FunctionAndTypeList | undefined;
}): React.ReactElement => {
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined,
  );
  const [runResponse, setRunResponse] = React.useState<unknown>(undefined);
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (selectedFunc === undefined) {
      const first = props.functionAndTypeList?.funcList?.[0];
      if (first === undefined) {
        setSelectedFunc(undefined);
      } else {
        setSelectedFunc(
          functionNamespaceToString(first.namespace) + "." + first.name,
        );
      }
    }
  }, [selectedFunc, props.functionAndTypeList]);

  const selectedFuncDetail = props.functionAndTypeList?.funcList?.find(
    (func) =>
      functionNamespaceToString(func.namespace) + "." + func.name ===
        selectedFunc,
  );

  return (
    <div className={c(containerStyle)}>
      <div className={c(contentStyle)}>
        <Select
          values={props.functionAndTypeList?.funcList}
          value={selectedFunc}
          onSelect={(e) => {
            setSelectedFunc(e);
          }}
        />
        <Button
          onClick={selectedFuncDetail?.input.name ===
                "Unit" &&
              selectedFuncDetail?.input.namespace.type === "coreType" &&
              !isRequesting
            ? () => {
              setIsRequesting(true);
              requestQuery({
                url: new URL(props.serverOrigin),
                inputType: selectedFuncDetail.input,
                outputType: selectedFuncDetail.output,
                typeMap: new Map(
                  coreTypeInfoList.map((
                    info,
                  ) => [
                    namespaceToString(info.namespace) + "." + info.name,
                    info,
                  ]),
                ),
                name: selectedFuncDetail.name,
                namespace: selectedFuncDetail.namespace,
                input: StructuredJsonValue.null,
              }).then((json) => {
                console.log("response", json);
                setRunResponse(json);
                setIsRequesting(false);
              });
            }
            : undefined}
        >
          Run
        </Button>
        <Result data={runResponse as RawJsonValue} requesting={isRequesting} />
      </div>

      {props.functionAndTypeList === undefined
        ? <div>loading...</div>
        : (
          <DetailView
            functionList={props.functionAndTypeList.funcList}
            selectedFuncName={selectedFunc}
            typeList={props.functionAndTypeList.typeList}
          />
        )}
    </div>
  );
};
