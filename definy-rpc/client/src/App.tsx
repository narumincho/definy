import * as React from "react";
import * as env from "./env";
import { Button } from "../../../client/ui/Button";
import { Editor } from "./Editor";
import { FuncDetail } from "./FuncDetail";
import { ServerOrigin } from "./ServerOrigin";

export const App = (): React.ReactElement => {
  const [functionList, setFunctionList] = React.useState<
    ReadonlyArray<FuncDetail> | undefined
  >(undefined);
  const [serverName, setServerName] = React.useState<string | undefined>();
  const [serverOrigin, setServerOrigin] = React.useState<string>(
    env.serverOrigin
  );
  const [editorCount, setEditorCount] = React.useState<number>(1);

  React.useEffect(() => {
    const url = new URL(serverOrigin);
    url.pathname = "/definyRpc/functionListByName";
    fetch(url)
      .then((response) => {
        return response.json();
      })
      .then((json: ReadonlyArray<FuncDetail>) => {
        setFunctionList(json);
      })
      .catch(() => {
        setFunctionList(undefined);
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
        overflowY: "scroll",
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

      {Array.from({ length: editorCount }, (_, i) => (
        <Editor
          key={i}
          functionList={functionList}
          serverOrigin={serverOrigin}
        />
      ))}
      <Button
        onClick={() => {
          setEditorCount((old) => old + 1);
        }}
      >
        +
      </Button>
    </div>
  );
};
