import * as React from "react";

export const App: React.FC<Record<string, unknown>> = () => {
  const [data, dispatch] = React.useState<number>(0);
  return <button onClick={() => dispatch(data + 1)}>{data}回押した</button>;
};
