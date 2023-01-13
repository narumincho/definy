import React from "https://esm.sh/react@18.2.0?pin=v102";
import { c, toStyleAndHash } from "../../cssInJs/mod.ts";
import { Button } from "../../editor/Button.tsx";
import { Editor, FunctionAndTypeList } from "./Editor.tsx";
import { ServerOrigin } from "./ServerOrigin.tsx";
import { SampleChart } from "./Chart.tsx";
import {
  FunctionDetail,
  FunctionNamespace,
  List,
  String,
  Unit,
} from "../core/coreType.ts";
import { requestQuery } from "../core/request.ts";
import { coreTypeInfoList } from "../core/coreTypeInfo.ts";
import { namespaceToString } from "../codeGen/namespace.ts";
import {
  functionListByName,
  name,
  typeList,
} from "../example/generated/meta.ts";

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
  const [functionAndTypeList, setFunctionAndTypeList] = React.useState<
    FunctionAndTypeList | undefined
  >(undefined);
  const [serverName, setServerName] = React.useState<string | undefined>();
  const [serverUrl, setServerUrl] = React.useState<string>(
    new URL(location.href).toString(),
  );
  const [editorCount, setEditorCount] = React.useState<number>(1);

  React.useEffect(() => {
    functionListByName({ url: new URL(serverUrl) }).then((result) => {
      if (result.type === "ok") {
        console.log("result.value", result.value);
        setFunctionAndTypeList((prev) => ({
          funcList: result.value,
          typeList: prev?.typeList ?? [],
        }));
      } else {
        setFunctionAndTypeList(undefined);
      }
    }).catch(() => {
      setFunctionAndTypeList(undefined);
    });
    typeList({ url: new URL(serverUrl) }).then((result) => {
      if (result.type === "ok") {
        console.log("result.value", result.value);
        setFunctionAndTypeList((prev) => ({
          funcList: prev?.funcList ?? [],
          typeList: result.value,
        }));
      } else {
        setFunctionAndTypeList(undefined);
      }
    }).catch(() => {
      setFunctionAndTypeList(undefined);
    });
    name({ url: new URL(serverUrl) })
      .then((result) => {
        if (result.type === "ok") {
          console.log("result.value", result.value);
          setServerName(result.value);
        } else {
          setServerName(undefined);
        }
      }).catch(() => {
        setServerName(undefined);
      });
  }, [serverUrl]);

  console.log("functionAndTypeList?.typeList", functionAndTypeList?.typeList);

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
          functionAndTypeList={functionAndTypeList}
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

      {functionAndTypeList && (
        <SampleChart functionAndTypeList={functionAndTypeList} />
      )}
    </div>
  );
};
