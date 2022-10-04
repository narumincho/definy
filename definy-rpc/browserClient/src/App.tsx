import * as React from "react";
import * as definyRpc from "./generated/definyRpc";
import { Button } from "../../../client/ui/Button";
import { Editor } from "./Editor";
import { ServerOrigin } from "./ServerOrigin";

export const App = (): React.ReactElement => {
  const [functionList, setFunctionList] = React.useState<
    ReadonlyArray<definyRpc.FunctionDetail> | undefined
  >(undefined);
  const [serverName, setServerName] = React.useState<string | undefined>();
  const [serverOrigin, setServerOrigin] = React.useState<string>(
    new URL(location.href).origin
  );
  const [editorCount, setEditorCount] = React.useState<number>(1);

  React.useEffect(() => {
    definyRpc.functionListByName({ origin: serverOrigin }).then((result) => {
      if (result.type === "ok") {
        setFunctionList(result.ok);
      } else {
        setFunctionList(undefined);
      }
    });
  }, [serverOrigin]);

  React.useEffect(() => {
    definyRpc.name({ origin: serverOrigin }).then((result) => {
      if (result.type === "ok") {
        setServerName(result.ok);
      } else {
        setServerName(undefined);
      }
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
        initServerOrigin={serverOrigin}
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
