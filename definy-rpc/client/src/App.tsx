import * as React from "react";
import { Select } from "./Select";

export const App = (): React.ReactElement => {
  const [namespaceList, setNamespaceList] = React.useState<
    ReadonlyArray<string> | undefined
  >(undefined);

  React.useEffect(() => {
    fetch("http://localhost:2520/definyRpc/functionByName")
      .then((response) => {
        return response.json();
      })
      .then((json: ReadonlyArray<ReadonlyArray<string>>) => {
        setNamespaceList(json.map((n) => n.join(".")));
      });
  }, []);

  return (
    <div
      css={{
        backgroundColor: "black",
        color: "white",
        height: "100%",
        padding: 8,
        boxSizing: "border-box",
      }}
    >
      <h1 css={{ margin: 0 }}>definy RPC</h1>

      <Select
        values={namespaceList}
        value={namespaceList?.[0] ?? undefined}
        onSelect={(e) => {
          console.log(e);
        }}
      />
    </div>
  );
};
