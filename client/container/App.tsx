import * as React from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import { App as UiApp } from "../ui/App";
import { useDefinyApp } from "../hook/useDefinyApp";

export const App: React.VFC<Record<string, string>> = () => {
  return (
    <SnackbarProvider maxSnack={4}>
      <AppInSnack />
    </SnackbarProvider>
  );
};

export const AppInSnack: React.VFC<Record<string, never>> = () => {
  const { enqueueSnackbar } = useSnackbar();
  const useDefinyAppResult = useDefinyApp({
    notificationMessageHandler: (message, variant) =>
      enqueueSnackbar(message, { variant }),
  });

  return <UiApp useDefinyAppResult={useDefinyAppResult} />;
};
