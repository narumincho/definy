import * as React from "react";
import { SnackbarProvider } from "notistack";
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
  const useDefinyAppResult = useDefinyApp();

  return <UiApp useDefinyAppResult={useDefinyAppResult} />;
};
