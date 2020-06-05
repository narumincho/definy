import * as React from "react";
import { button } from "./ui";

export const App: React.FC<Record<string | number | symbol, never>> = () => {
  const [data, dispatch] = React.useState<number>(0);
  return button(
    { padding: 16, color: "green" },
    { onClick: () => dispatch(data + 1) },
    data.toString() + "回押した"
  );
};
