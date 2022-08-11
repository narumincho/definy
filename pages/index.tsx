import * as React from "react";
import { App } from "../client/ui/App";
import { useDefinyApp } from "../client/hook/useDefinyApp";

export const TopPage = (): React.ReactElement => {
  const useDefinyAppResult = useDefinyApp();

  return <App useDefinyAppResult={useDefinyAppResult} />;
};

export default TopPage;
