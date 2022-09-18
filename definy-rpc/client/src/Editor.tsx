import * as React from "react";
import { Button } from "../../../client/ui/Button";
import { DetailView } from "./DetailView";
import { FuncDetail } from "./FuncDetail";
import { Select } from "./Select";

export const Editor = (props: {
  readonly serverOrigin: string;
  readonly functionList: ReadonlyArray<FuncDetail> | undefined;
}): React.ReactElement => {
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined
  );
  const [runResponse, setRunResponse] = React.useState<unknown>(undefined);

  React.useEffect(() => {
    if (selectedFunc === undefined) {
      setSelectedFunc(props.functionList?.[0]?.name.join("."));
    }
  }, [selectedFunc, props.functionList]);

  const selectedFuncDetail = props.functionList?.find(
    (func) => func.name.join(".") === selectedFunc
  );
  return (
    <div
      css={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <div css={{ display: "grid", alignContent: "start" }}>
        <Select
          values={props.functionList}
          value={selectedFunc}
          onSelect={(e) => {
            setSelectedFunc(e);
          }}
        />
        <Button
          onClick={
            selectedFuncDetail?.input.fullName.join(".") === "definyRpc.Unit"
              ? () => {
                  const url = new URL(props.serverOrigin);
                  url.pathname = "/" + selectedFuncDetail.name.join("/");
                  fetch(url)
                    .then((response) => {
                      return response.json();
                    })
                    .then((json: unknown) => {
                      console.log("response", json);
                      setRunResponse(json);
                    })
                    .catch(() => {
                      setRunResponse(undefined);
                    });
                }
              : undefined
          }
        >
          Run
        </Button>
        <div css={{ overflowWrap: "anywhere" }}>
          {typeof runResponse === "string" ? (
            <Button
              onClick={() => {
                navigator.clipboard.writeText(runResponse);
              }}
            >
              クリップボードにコピー
            </Button>
          ) : (
            <></>
          )}
          <div>{JSON.stringify(runResponse, undefined)}</div>
        </div>
      </div>

      {props.functionList === undefined ? (
        <div>loading...</div>
      ) : (
        <DetailView
          functionList={props.functionList}
          selectedFuncName={selectedFunc}
        />
      )}
    </div>
  );
};
