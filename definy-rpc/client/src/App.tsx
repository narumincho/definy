import * as React from "react";
import * as env from "./env";
import { Button } from "../../../client/ui/Button";
import { DetailView } from "./DetailView";
import { FuncDetail } from "./FuncDetail";
import { Select } from "./Select";
import { ServerOrigin } from "./ServerOrigin";

export const App = (): React.ReactElement => {
  const [functionList, setFunctionList] = React.useState<
    ReadonlyArray<FuncDetail> | undefined
  >(undefined);
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined
  );
  const [serverName, setServerName] = React.useState<string | undefined>();
  const [serverOrigin, setServerOrigin] = React.useState<string>(
    env.serverOrigin
  );
  const [runResponse, setRunResponse] = React.useState<string | undefined>(
    undefined
  );

  React.useEffect(() => {
    const url = new URL(serverOrigin);
    url.pathname = "/definyRpc/functionListByName";
    fetch(url)
      .then((response) => {
        return response.json();
      })
      .then((json: ReadonlyArray<FuncDetail>) => {
        setFunctionList(json);
        setSelectedFunc(json[0]?.name.join("."));
      })
      .catch(() => {
        setFunctionList(undefined);
        setSelectedFunc(undefined);
      });
  }, [serverOrigin]);

  React.useEffect(() => {
    const url = new URL(serverOrigin);
    url.pathname = "/definyRpc/name";
    fetch(url)
      .then((response) => {
        return response.json();
      })
      .then((json: string) => {
        console.log("name", json);
        setServerName(json);
      })
      .catch(() => {
        setServerName(undefined);
      });
  }, [serverOrigin]);

  const selectedFuncDetail = functionList?.find(
    (func) => func.name.join(".") === selectedFunc
  );
  return (
    <div
      css={{
        backgroundColor: "#111",
        color: "white",
        height: "100%",
        boxSizing: "border-box",
        display: "grid",
        gap: 16,
        alignContent: "start",
      }}
    >
      <h2
        css={{
          backgroundColor: "#5fb58a",
          fontSize: 14,
          color: "#000",
          margin: 0,
          padding: "0 8px",
        }}
      >
        definy RPC Browser Client
      </h2>

      <ServerOrigin
        serverName={serverName}
        serverOrigin={serverOrigin}
        onChangeServerOrigin={setServerOrigin}
      />

      <div
        css={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr" }}
      >
        <div css={{ display: "grid", alignContent: "start" }}>
          <Select
            values={functionList}
            value={selectedFunc}
            onSelect={(e) => {
              setSelectedFunc(e);
            }}
          />
          <Button
            onClick={
              selectedFuncDetail?.input.fullName.join(".") === "definyRpc.Unit"
                ? () => {
                    const url = new URL(serverOrigin);
                    url.pathname = "/" + selectedFuncDetail.name.join("/");
                    fetch(url)
                      .then((response) => {
                        return response.json();
                      })
                      .then((json: unknown) => {
                        console.log("response", json);
                        setRunResponse(JSON.stringify(json));
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
          {runResponse}
        </div>

        {functionList === undefined ? (
          <div>loading...</div>
        ) : (
          <DetailView
            functionList={functionList}
            selectedFuncName={selectedFunc}
          />
        )}
      </div>
    </div>
  );
};
