import React from "https://esm.sh/react@18.2.0?pin=v99";
import * as definyRpc from "../generated/definyRpc.ts";
import { Button } from "../../editor/Button.tsx";
import { DetailView } from "./DetailView.tsx";
import { Result } from "./Result.tsx";
import { Select } from "./Select.tsx";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { RawJsonValue } from "../../typedJson.ts";

const containerStyle = toStyleAndHash({
  padding: 16,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
});

const contentStyle = toStyleAndHash({
  display: "grid",
  alignContent: "start",
});

export const Editor = (props: {
  readonly serverOrigin: string;
  readonly functionList: ReadonlyArray<definyRpc.FunctionDetail> | undefined;
}): React.ReactElement => {
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined,
  );
  const [runResponse, setRunResponse] = React.useState<unknown>(undefined);
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (selectedFunc === undefined) {
      setSelectedFunc(props.functionList?.[0]?.name.join("."));
    }
  }, [selectedFunc, props.functionList]);

  const selectedFuncDetail = props.functionList?.find(
    (func) => func.name.join(".") === selectedFunc,
  );

  return (
    <div className={c(containerStyle)}>
      <div className={c(contentStyle)}>
        <Select
          values={props.functionList}
          value={selectedFunc}
          onSelect={(e) => {
            setSelectedFunc(e);
          }}
        />
        <Button
          onClick={selectedFuncDetail?.input.fullName.join(".") ===
                "definyRpc.Unit" &&
              !isRequesting
            ? () => {
              setIsRequesting(true);
              const url = new URL(props.serverOrigin);
              url.pathname = url.pathname + "/" +
                selectedFuncDetail.name.join("/");
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
            : undefined}
        >
          Run
        </Button>
        <Result data={runResponse as RawJsonValue} requesting={isRequesting} />
      </div>

      {props.functionList === undefined ? <div>loading...</div> : (
        <DetailView
          functionList={props.functionList}
          selectedFuncName={selectedFunc}
        />
      )}
    </div>
  );
};
