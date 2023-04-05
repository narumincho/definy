import React from "https://esm.sh/react@18.2.0?pin=v111";
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
  const [responseList, setResponseList] = React.useState<ReadonlyArray<any>>(
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
        {responseList.map((response, index) => (
          <ResponseBalloon key={index} text={JSON.stringify(response)} />
        ))}
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
                setResponseList((prev) => [
                  ...prev,
                  json,
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
  gap: 24,
});

const LeftBalloon = styled("div", {
  borderRadius: 8,
  padding: 16,
  position: "relative",
  backgroundColor: "#333",
  "&:before": {
    content: "",
    position: "absolute",
    top: "50%",
    left: -30,
    marginTop: -15,
    border: "15px solid transparent",
    borderRight: "15px solid #333",
  },
});

const ResponseBalloon = (props: {
  readonly text: string;
}): React.ReactElement => {
  return (
    <ResponseBalloonContainer>
      <div>server icon</div>
      <LeftBalloon>{props.text}</LeftBalloon>
    </ResponseBalloonContainer>
  );
};
