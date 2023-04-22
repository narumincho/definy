import React from "https://esm.sh/react@18.2.0?pin=v117";
import { styled } from "./style.ts";
import { Select } from "./Select.tsx";
import { FunctionAndTypeList } from "./Editor.tsx";
import { Button } from "../../editor/Button.tsx";
import {
  functionNamespaceToString,
  namespaceToString,
} from "../codeGen/namespace.ts";
import { requestQuery } from "../core/request.ts";
import { StructuredJsonValue } from "../core/coreType.ts";
import { coreTypeInfoList } from "../core/coreTypeInfo.ts";

const Container = styled("div", {
  display: "grid",
  gridTemplateRows: "1fr auto",
});

const HistoryArea = styled("div", {
  display: "grid",
  alignContent: "start",
  gap: 8,
});

const InputArea = styled("div", {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
});

export const ChatView = (
  props: {
    readonly functionAndTypeList: FunctionAndTypeList | undefined;
    readonly serverOrigin: string;
  },
): React.ReactElement => {
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined,
  );
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);
  const [historyList, setHistoryList] = React.useState<
    ReadonlyArray<
      { readonly type: "request" | "response"; readonly value: unknown }
    >
  >(
    [],
  );

  const selectedFuncDetail = props.functionAndTypeList?.funcList?.find(
    (func) =>
      functionNamespaceToString(func.namespace) + "." + func.name ===
        selectedFunc,
  );

  return (
    <Container>
      <HistoryArea>
        {historyList.map((history, index) => {
          switch (history.type) {
            case "response":
              return (
                <ResponseBalloon
                  key={index}
                  text={JSON.stringify(history.value)}
                />
              );
            case "request":
              return (
                <RequestBalloon
                  key={index}
                  text={JSON.stringify(history.value)}
                />
              );
          }
        })}
      </HistoryArea>
      <InputArea>
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
              setHistoryList((prev) => [
                ...prev,
                { type: "request", value: selectedFuncDetail },
              ]);
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
                setHistoryList((prev) => [
                  ...prev,
                  { type: "response", value: json },
                ]);
                setIsRequesting(false);
              });
            }
            : undefined}
        >
          Run
        </Button>
      </InputArea>
    </Container>
  );
};

const ResponseBalloonContainer = styled("div", {
  display: "flex",
});

const Balloon = styled("div", {
  borderRadius: 8,
  padding: 16,
  backgroundColor: "#333",
});

const WidthSpace = styled("div", {
  width: 16,
});

const ResponseBalloon = (props: {
  readonly text: string;
}): React.ReactElement => {
  return (
    <ResponseBalloonContainer>
      <div>server icon</div>
      <WidthSpace />
      <svg viewBox="0 0 10 10" width={32}>
        <polygon fill="#333" points="0,5 10,0 10,10" />
      </svg>
      <Balloon>{props.text}</Balloon>
    </ResponseBalloonContainer>
  );
};

const RequestBalloonContainer = styled("div", {
  display: "flex",
  flexDirection: "row-reverse",
});

const RequestBalloon = (props: {
  readonly text: string;
}): React.ReactElement => {
  return (
    <RequestBalloonContainer>
      <div>client icon</div>
      <WidthSpace />
      <svg viewBox="0 0 10 10" width={32}>
        <polygon fill="#333" points="10,5 0,0 0,10" />
      </svg>
      <Balloon>{props.text}</Balloon>
    </RequestBalloonContainer>
  );
};
