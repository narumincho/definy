import * as React from "react";
import * as ReactDom from "react-dom";
import { SnackbarProvider, useSnackbar } from "notistack";
import { UseDefinyAppOption, useDefinyApp } from "./hook/useDefinyApp";
import { App } from "./ui/App";

export const AppInSnack: React.VFC<Record<string, never>> = () => {
  const { enqueueSnackbar } = useSnackbar();
  const useDefinyAppOption = React.useMemo<UseDefinyAppOption>(
    () => ({
      notificationMessageHandler: (message, variant) =>
        enqueueSnackbar(message, { variant }),
    }),
    [enqueueSnackbar]
  );
  const useDefinyAppResult = useDefinyApp(useDefinyAppOption);

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
