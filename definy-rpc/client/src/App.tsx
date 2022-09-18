import * as React from "react";
import * as env from "./env";
import { Select } from "./Select";
import { OneLineTextEditor } from "../../../client/ui/OneLineTextEditor";

export const App = (): React.ReactElement => {
  const [functionList, setFunctionList] = React.useState<
    | ReadonlyArray<{
        readonly name: string;
        readonly description: string;
      }>
    | undefined
  >(undefined);
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined
  );
  const [serverName, setServerName] = React.useState<string | undefined>();
  const [serverOrigin, setServerOrigin] = React.useState<string>(
    env.serverOrigin
  );

  React.useEffect(() => {
    const url = new URL(serverOrigin);
    url.pathname = "/definyRpc/functionListByName";
    fetch(url)
      .then((response) => {
        return response.json();
      })
      .then(
        (
          json: ReadonlyArray<{
            readonly name: ReadonlyArray<string>;
            readonly description: string;
          }>
        ) => {
          setFunctionList(json.map((e) => ({ ...e, name: e.name.join(".") })));
          setSelectedFunc(json[0]?.name.join("."));
        }
      )
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

      <div css={{ padding: 16 }}>
        <div>
          <label
            css={{
              display: "grid",
              gridAutoFlow: "column",
              gap: 16,
              justifyContent: "start",
            }}
          >
            server origin
            <OneLineTextEditor
              id="server-origin"
              value={serverOrigin}
              css={{
                fontFamily: "monospace",
              }}
              onChange={(value) => {
                setServerOrigin(value);
              }}
            ></OneLineTextEditor>
          </label>
        </div>
        <h1
          css={{
            margin: 0,
            backgroundColor: serverName === undefined ? "#444" : "transparent",
          }}
        >
          {serverName === undefined ? "..." : serverName}
        </h1>
      </div>

      <div
        css={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr" }}
      >
        <div>
          <Select
            values={functionList}
            value={selectedFunc}
            onSelect={(e) => {
              setSelectedFunc(e);
            }}
          />
          <button>Run まだ..</button>
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

const DetailView = (props: {
  readonly functionList: ReadonlyArray<{
    readonly name: string;
    readonly description: string;
  }>;
  readonly selectedFuncName: string | undefined;
}): React.ReactElement => {
  if (props.selectedFuncName === undefined) {
    return (
      <div>
        <h2>未選択</h2>
      </div>
    );
  }
  const selectedFuncDetail = props.functionList.find(
    (func) => func.name === props.selectedFuncName
  );

  if (selectedFuncDetail === undefined) {
    return (
      <div>
        <h2>不明な関数</h2>
      </div>
    );
  }
  return (
    <div>
      <h2>{selectedFuncDetail.name}</h2>
      <div>{selectedFuncDetail.description}</div>
    </div>
  );
};
