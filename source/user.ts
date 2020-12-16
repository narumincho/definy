import * as d from "definy-core/source/data";
import { AppInterface, Message } from "./appInterface";
import { CSSObject, css, jsx as h } from "@emotion/react";
import { Component, ReactElement } from "react";
import { Icon, icon } from "./icon";
import { Image, image } from "./image";
import { Link, link } from "./link";
import { c, div } from "./view/viewUtil";
import { Element } from "./view/view";
import { Model } from "./model";

interface Props {
  readonly model: Model;
  readonly userId: d.UserId;
}

export class User extends Component<Props, never> {
  constructor(props: Props) {
    super(props);
    props.model.requestUser(props.userId);
  }

  render(): ReactElement {
    const userState = this.props.model.userMap.get(this.props.userId);
    if (userState === undefined) {
      return h("div", { css: loadingStyle }, "...");
    }
    switch (userState._) {
      case "Requesting":
        return h(
          "div",
          { css: loadingStyle },
          h(Icon, { iconType: "Requesting" })
        );
      case "Unknown":
        return h("div", { css: loadingStyle }, "ユーザーの取得に失敗しました");
      case "Deleted":
        return h(
          "div",
          { css: loadingStyle },
          "現在, userIdが " + this.props.userId + " のユーザーは存在しません"
        );
      case "Loaded": {
        const { data } = userState.dataWithTime;
        return h(
          Link,
          {
            model: this.props.model,
            theme: "Gray",
            location: d.Location.User(this.props.userId),
            css: css({
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              height: 48,
              alignItems: "center",
              gap: 8,
              padding: 8,
            }),
          },
          [
            h(Image, {
              imageToken: data.imageHash,
              model: this.props.model,
              key: "image",
              alternativeText: data.name + "のアイコン",
              width: 32,
              height: 32,
              isCircle: true,
            }),
            data.name,
          ]
        );
      }
    }
  }
}

const loadingStyle = css({
  display: "grid",
  height: 48,
  alignItems: "center",
  gap: 8,
  padding: 8,
});

export const userCard = (
  appInterface: AppInterface,
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
