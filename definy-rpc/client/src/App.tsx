import * as React from "react";
import { Select } from "./Select";

export const App = (): React.ReactElement => {
  const [functionList, setFunctionList] = React.useState<
    ReadonlyArray<string> | undefined
  >(undefined);
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined
  );

  React.useEffect(() => {
    fetch("http://localhost:2520/definyRpc/functionByName")
      .then((response) => {
        return response.json();
      })
      .then((json: ReadonlyArray<ReadonlyArray<string>>) => {
        const result = json.map((n) => n.join("."));
        setFunctionList(result);
        setSelectedFunc(result[0]);
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
        values={functionList}
        value={selectedFunc}
        onSelect={(e) => {
          setSelectedFunc(e);
          console.log(e);
        }}
      />
    </div>
  );
};
