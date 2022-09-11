import * as React from "react";
import { Select } from "./Select";

export const App = (): React.ReactElement => {
  const [namespaceList, setNamespaceList] = React.useState<
    ReadonlyArray<string> | undefined
  >(undefined);

  React.useEffect(() => {
    fetch("http://localhost:2520/definyRpc/namespaceList")
      .then((response) => {
        return response.json();
      })
      .then((json: ReadonlyArray<string>) => {
        setNamespaceList(json);
      });
  }, []);
  return (
    <div
      css={{
        backgroundColor: "black",
        color: "white",
        height: "100%",
        padding: 8,
      }}
    >
      <h1 css={{ margin: 0 }}>definy RPC</h1>
      <div>namespace</div>
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
