import * as React from "react";

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
    <div>
      {namespaceList === undefined
        ? "loading..."
        : namespaceList.map((namespace) => (
            <div key={namespace}>{namespace}</div>
          ))}
    </div>
  );
};
