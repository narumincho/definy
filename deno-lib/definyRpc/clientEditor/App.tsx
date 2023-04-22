import React from "https://esm.sh/react@18.2.0?pin=v117";
import { Button } from "../../editor/Button.tsx";
import { Editor, FunctionAndTypeList } from "./Editor.tsx";
import { SampleChart } from "./Chart.tsx";
import {
  functionListByName,
  name,
  typeList,
} from "../example/generated/meta.ts";
import { styled } from "./style.ts";
import { ServerOrigin } from "./ServerOrigin.tsx";
import { ChatView } from "./ChatView.tsx";

const Container = styled("div", {
  backgroundColor: "#111",
  color: "white",
  height: "100%",
  boxSizing: "border-box",
  display: "grid",
  alignContent: "start",
  gridTemplateRows: "auto auto 1fr",
});

const StyledTitle = styled("h2", {
  backgroundColor: "#5fb58a",
  fontSize: 14,
  color: "#000",
  margin: 0,
  padding: "0 8px",
});

const Tab = styled("div", {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
});

const TabItem = styled("a", {
  padding: 8,
  textAlign: "center",
  background: "#444",
  borderBottomStyle: "solid",
  borderColor: "#666",
  "&:hover": {
    background: "#222",
  },
  variants: {
    selected: {
      selected: {
        background: "#000",
        borderStyle: "solid",
        borderBottomStyle: "none",
      },
      notSelected: {},
    },
  },
});

type TabValue = typeof allTabValues[number];

const allTabValues = ["old", "chat", "graph"] as const;

export const App = (): React.ReactElement => {
  const [functionAndTypeList, setFunctionAndTypeList] = React.useState<
    FunctionAndTypeList | undefined
  >(undefined);
  const [serverName, setServerName] = React.useState<string | undefined>();
  const [serverUrl, setServerUrl] = React.useState<string>(
    new URL(location.href).toString(),
  );
  const [editorCount, setEditorCount] = React.useState<number>(1);
  const [selectedTabValue, setSelectedTabValue] = React.useState<TabValue>(
    "old",
  );

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
    <Container>
      <StyledTitle>definy RPC Browser Client</StyledTitle>
      <Tab>
        {allTabValues.map((tabValue) => (
          <TabItem
            key={tabValue}
            selected={tabValue === selectedTabValue
              ? "selected"
              : "notSelected"}
            onClick={() => {
              setSelectedTabValue(tabValue);
            }}
          >
            {tabValue}
          </TabItem>
        ))}
      </Tab>
      <TabContent
        selectedTabValue={selectedTabValue}
        serverName={serverName}
        serverUrl={serverUrl}
        setServerUrl={setServerUrl}
        editorCount={editorCount}
        functionAndTypeList={functionAndTypeList}
        setEditorCount={setEditorCount}
      />
    </Container>
  );
};

const TabContent = (props: {
  readonly selectedTabValue: TabValue;
  readonly serverName: string | undefined;
  readonly serverUrl: string;
  readonly setServerUrl: React.Dispatch<React.SetStateAction<string>>;
  readonly editorCount: number;
  readonly functionAndTypeList: FunctionAndTypeList | undefined;
  readonly setEditorCount: React.Dispatch<React.SetStateAction<number>>;
}): React.ReactElement => {
  switch (props.selectedTabValue) {
    case "old":
      return (
        <div>
          <ServerOrigin
            serverName={props.serverName}
            initServerOrigin={props.serverUrl}
            onChangeServerOrigin={props.setServerUrl}
          />
          {Array.from({ length: props.editorCount }, (_, i) => (
            <Editor
              key={i}
              functionAndTypeList={props.functionAndTypeList}
              serverOrigin={props.serverUrl}
            />
          ))}
          <Button
            onClick={() => {
              props.setEditorCount((old) => old + 1);
            }}
          >
            +
          </Button>
        </div>
      );
    case "graph": {
      if (!props.functionAndTypeList) {
        return <div>loading...</div>;
      }
      return <SampleChart functionAndTypeList={props.functionAndTypeList} />;
    }
    case "chat":
      return (
        <ChatView
          functionAndTypeList={props.functionAndTypeList}
          serverOrigin={props.serverUrl}
        />
      );
  }
};
