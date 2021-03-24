import * as React from "react";

export const fullScreen = (story: () => React.ReactElement<unknown>) => (
  <div id="story-book-full-screen-decorator" style={{ height: "100vh" }}>
    {story()}
  </div>
);
