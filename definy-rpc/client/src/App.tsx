import * as React from "react";
import { Select } from "./Select";

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

  React.useEffect(() => {
    fetch("http://localhost:2520/definyRpc/functionListByName")
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
      );
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

      <div css={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
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
