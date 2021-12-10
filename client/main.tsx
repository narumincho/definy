import * as React from "react";
import * as ReactDom from "react-dom";
import { App } from "./ui/App";
import { useDefinyApp } from "./hook/useDefinyApp";

export const AppWithState = (): React.ReactElement => {
  const useDefinyAppResult = useDefinyApp();

  return <App useDefinyAppResult={useDefinyAppResult} />;
};

const entryElement = document.createElement("div");
entryElement.style.height = "100%";
entryElement.style.overflow = "hidden";
document.body.textContent = "";
document.body.appendChild(entryElement);
ReactDom.render(
  <React.StrictMode>
    <AppWithState />
  </React.StrictMode>,
  entryElement
);
