import * as React from "react";
import * as definyRpc from "./generated/definyRpc";
import { Button } from "../../../client/ui/Button";
import { DetailView } from "./DetailView";
import { Select } from "./Select";

export const Editor = (props: {
  readonly serverOrigin: string;
  readonly functionList: ReadonlyArray<definyRpc.FunctionDetail> | undefined;
}): React.ReactElement => {
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined
  );
  const [runResponse, setRunResponse] = React.useState<unknown>(undefined);
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (selectedFunc === undefined) {
      setSelectedFunc(props.functionList?.[0]?.name.join("."));
    }
  }, [selectedFunc, props.functionList]);

  const selectedFuncDetail = props.functionList?.find(
    (func) => func.name.join(".") === selectedFunc
  );
  const [responseToClipboardLoading, setResponseToClipboardLoading] =
    React.useState<boolean>(false);

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
            selectedFuncDetail?.input.fullName.join(".") === "definyRpc.Unit" &&
            !isRequesting
              ? () => {
                  setIsRequesting(true);
                  const url = new URL(props.serverOrigin);
                  url.pathname = "/" + selectedFuncDetail.name.join("/");
                  fetch(url)
                    .then((response) => {
                      return response.json();
                    })
                    .then((json: unknown) => {
                      console.log("response", json);
                      setRunResponse(json);
                      setIsRequesting(false);
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
              onClick={
                responseToClipboardLoading
                  ? undefined
                  : () => {
                      setResponseToClipboardLoading(true);
                      navigator.clipboard.writeText(runResponse).then(() => {
                        setResponseToClipboardLoading(false);
                      });
                    }
              }
            >
              クリップボードにコピー
            </Button>
          ) : (
            <></>
          )}
          <div>
            {isRequesting ? <div>Requesting...</div> : <></>}
            <div
              css={{
                whiteSpace: "pre-wrap",
                borderStyle: "solid",
                borderColor: "#ccc",
                padding: 8,
              }}
            >
              {JSON.stringify(runResponse, undefined)}
            </div>
          </div>
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
