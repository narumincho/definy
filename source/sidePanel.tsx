/** @jsx jsx */

import * as ui from "./ui";
import { data } from "definy-common";
import * as React from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from "react-free-style";

const sidePanelWidth = 260;

export const SidePanel: React.FC<{
  urlData: data.UrlData;
  onJump: (urlData: data.UrlData) => void;
}> = (prop) => (
  <div
    css={{
      width: sidePanelWidth,
      backgroundColor: ui.backgroundColorDark,
      height: "100%",
    }}
  >
    <ui.Link
      urlData={{ ...prop.urlData, location: data.Location.Home }}
      onJump={prop.onJump}
    >
      <div css={{ color: "#b9d09b", fontSize: 32 }}>Definy</div>
    </ui.Link>
    <div>ログインボタンかログインしているユーザーの情報とリンク</div>
    <ui.Link
      urlData={{ ...prop.urlData, location: data.Location.About }}
      onJump={prop.onJump}
    >
      <div>About</div>
    </ui.Link>
  </div>
);
