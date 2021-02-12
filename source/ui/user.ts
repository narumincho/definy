import * as d from "definy-core/source/data";
import { Message, State } from "../messageAndState";
import { c, div } from "@narumincho/html/viewUtil";
import { CSSObject } from "@emotion/css";
import { Element } from "@narumincho/html/view";
import { icon } from "./icon";
import { image } from "./image";
import { link } from "./link";

export const userCard = (
  appInterface: State,
  userId: d.UserId
): Element<Message> => {
  const userState = appInterface.userMap.get(userId);
  if (userState === undefined) {
    return div({ style: loadingCss }, "...");
  }
  switch (userState._) {
    case "Requesting":
      return div({ style: loadingCss }, c([["icon", icon("Requesting")]]));
    case "Unknown":
      return div({ style: loadingCss }, "ユーザーの取得に失敗しました");
    case "Deleted":
      return div(
        { style: loadingCss },
        "現在, userIdが " + userId + " のユーザーは存在しません"
      );
    case "Loaded": {
      const { data } = userState.dataWithTime;
      return link(
        {
          appInterface,
          theme: "Gray",
          location: d.Location.User(userId),
          style: {
            display: "grid",
            gridTemplateColumns: "32px 1fr",
            height: 48,
            alignItems: "center",
            gap: 8,
            padding: 8,
          },
        },
        c([
          [
            "icon",
            image({
              appInterface,
              imageToken: data.imageHash,
              alternativeText: data.name + "のアイコン",
              width: 32,
              height: 32,
              isCircle: true,
            }),
          ],
          ["name", div({}, data.name)],
        ])
      );
    }
  }
};

const loadingCss: CSSObject = {
  display: "grid",
  height: 48,
  alignItems: "center",
  gap: 8,
  padding: 8,
};
