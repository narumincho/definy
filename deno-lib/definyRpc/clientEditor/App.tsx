import React from "https://esm.sh/react@18.2.0?pin=v99";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { Button } from "../../editor/Button.tsx";
import { Editor } from "./Editor.tsx";
import { ServerOrigin } from "./ServerOrigin.tsx";
import { SampleChart } from "./Chart.tsx";
import { FunctionDetail } from "../core/coreType.ts";

const containerStyle = toStyleAndHash({
  backgroundColor: "#111",
  color: "white",
  height: "100%",
  boxSizing: "border-box",
  display: "grid",
  gap: 16,
  alignContent: "start",
  overflowY: "scroll",
});

const titleStyle = toStyleAndHash({
  backgroundColor: "#5fb58a",
  fontSize: 14,
  color: "#000",
  margin: 0,
  padding: "0 8px",
});

export const App = (): React.ReactElement => {
  const [functionList, setFunctionList] = React.useState<
    ReadonlyArray<FunctionDetail> | undefined
  >(undefined);
  const [serverName, setServerName] = React.useState<string | undefined>();
  const [serverUrl, setServerUrl] = React.useState<string>(
    new URL(location.href).toString(),
  );
  const [editorCount, setEditorCount] = React.useState<number>(1);

  React.useEffect(() => {
    fetch(serverUrl + "/meta/functionListByName").then((response) =>
      response.json()
    ).then((result) => {
      setFunctionList(result.ok);
    }).catch(() => {
      setFunctionList(undefined);
    });
  }, [serverUrl]);

  return (
    <div className={c(containerStyle)}>
      <h2 className={c(titleStyle)}>definy RPC Browser Client</h2>

      <ServerOrigin
        serverName={serverName}
        initServerOrigin={serverUrl}
        onChangeServerOrigin={setServerUrl}
      />
      {Array.from({ length: editorCount }, (_, i) => (
        <Editor
          key={i}
          functionAndTypeList={functionList === undefined
            ? undefined
            : { funcList: functionList, typeList: [] }}
          serverOrigin={serverUrl}
        />
      ))}
      <Button
        onClick={() => {
          setEditorCount((old) => old + 1);
        }}
      >
        +
      </Button>

      <SampleChart />
    </div>
  );
};
