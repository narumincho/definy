import * as React from "react";
import { globalStyle } from "../common/globalStyle";
import { injectGlobal } from "@emotion/css";

export const fullScreen = (
  Story: () => React.ReactElement<unknown>
): React.ReactElement => {
  React.useEffect(() => {
    injectGlobal(globalStyle);
  }, []);
  return (
    <div id="story-book-full-screen-decorator" style={{ height: "100vh" }}>
      <Story />
    </div>
  );
};
