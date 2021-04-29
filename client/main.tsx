import * as React from "react";
import * as ReactDom from "react-dom";
import { SnackbarProvider, useSnackbar } from "notistack";
import { App } from "./ui/App";
import { useDefinyApp } from "./hook/useDefinyApp";

export const AppInSnack: React.VFC<Record<string, never>> = () => {
  const { enqueueSnackbar } = useSnackbar();
  const useDefinyAppResult = useDefinyApp({
    notificationMessageHandler: (message, variant) =>
      enqueueSnackbar(message, { variant }),
  });

  return <App useDefinyAppResult={useDefinyAppResult} />;
};

const entryElement = document.createElement("div");
entryElement.style.height = "100%";
entryElement.style.overflow = "hidden";
document.body.textContent = "";
document.body.appendChild(entryElement);
ReactDom.render(
  <React.StrictMode>
    <SnackbarProvider maxSnack={4}>
      <AppInSnack />
    </SnackbarProvider>
  </React.StrictMode>,
  entryElement
);
