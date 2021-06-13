import * as React from "react";
import { globalStyle } from "../common/globalStyle";
import { injectGlobal } from "@emotion/css";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: { expanded: true },
  layout: "fullscreen",
};

const FullScreen = (
  Story: () => React.ReactElement<unknown>
): React.ReactElement => {
  React.useEffect(() => {
    injectGlobal(globalStyle);
  }, []);
  return (
    <div
      id="story-book-full-screen-decorator"
      style={{ display: "grid", placeItems: "center", height: "100vh" }}
    >
      <Story />
    </div>
  );
};

export const decorators = [FullScreen];
