import * as React from "react";
import { injectGlobal } from "@emotion/css";
import { globalStyle } from "../common/globalStyle";

export const fullScreen = (Story: () => React.ReactElement<unknown>) => {
  React.useEffect(() => {
    injectGlobal(globalStyle);
  }, []);
  return (
    <div id="story-book-full-screen-decorator" style={{ height: "100vh" }}>
      <Story />
    </div>
  );
};
