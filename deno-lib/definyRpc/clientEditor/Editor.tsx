import React, { useCallback } from "https://esm.sh/react@18.2.0?pin=v106";
import { Button } from "../../editor/Button.tsx";
import { DetailView } from "./DetailView.tsx";
import { Result } from "./Result.tsx";
import { Select } from "./Select.tsx";
import { RawJsonValue } from "../../typedJson.ts";
import {
  DefinyRpcTypeInfo,
  FunctionDetail,
  StructuredJsonValue,
  Type,
} from "../core/coreType.ts";
import {
  functionNamespaceToString,
  namespaceEqual,
  namespaceToString,
} from "../codeGen/namespace.ts";
import { requestQuery } from "../core/request.ts";
import { coreTypeInfoList } from "../core/coreTypeInfo.ts";
import { styled } from "./style.ts";

const Container = styled("div", {
  padding: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
});

const Content = styled("div", {
  display: "grid",
  alignContent: "start",
});

const Spacer = styled("div", {
  height: 16,
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

  const inputType = selectedFuncDetail?.input;

  return (
    <Container>
      <Content>
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
                  [
                    ...coreTypeInfoList,
                    ...props.functionAndTypeList?.typeList ?? [],
                  ]
                    .map((
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
        <Spacer />
        <Result data={runResponse as RawJsonValue} requesting={isRequesting} />
      </Content>

      {props.functionAndTypeList === undefined
        ? <div>loading...</div>
        : (
          <DetailView
            functionList={props.functionAndTypeList.funcList}
            selectedFuncName={selectedFunc}
            typeList={props.functionAndTypeList.typeList}
          />
        )}
    </Container>
  );
};

const initValue = <t extends unknown>(
  typeList: ReadonlyArray<DefinyRpcTypeInfo>,
  type: Type<t>,
): t => {
  const typeInfo = typeList.find((t) =>
    namespaceEqual(t.namespace, type.namespace) &&
    t.name === type.name
  );
  if (typeInfo === undefined) {
    throw new Error("not found " + type.name);
  }
  switch (typeInfo.body.type) {
    case "string":
      return "" as t;
    case "number":
      return 0 as t;
    case "boolean":
      return "false" as t;
    case "list":
      return [] as t;
    case "set":
      return new Set() as t;
    case "url":
      return new URL("https://definy.app/") as t;
    case "unit":
      return undefined as t;
    case "map":
      return new Map() as t;
    case "product":
      return "wip" as t;
    case "sum":
      return "wip" as t;
  }
};

const InputEditor = <t extends unknown>(props: {
  readonly typeList: ReadonlyArray<DefinyRpcTypeInfo>;
  readonly type: Type<t>;
  readonly onChange: (value: t) => void;
}): React.ReactElement => {
  const typeInfo = props.typeList.find((t) =>
    namespaceEqual(t.namespace, props.type.namespace) &&
    t.name === props.type.name
  );
  switch (typeInfo?.body.type) {
    case "boolean":
      return <input type="checkbox" checked={false} />;
    case "string":
      return <input type="text" />;
    case "number":
      return <input type="number" />;
  }
  return <></>;
};
