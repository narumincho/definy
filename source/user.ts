import * as d from "definy-core/source/data";
import { Component, ReactElement } from "react";
import { css, jsx as h } from "@emotion/react";
import { Icon } from "./icon";
import { Image } from "./image";
import { Link } from "./link";
import { Model } from "./model";
import { div } from "./ui";

type Props = {
  readonly model: Model;
  readonly userId: d.UserId;
};

export class User extends Component<Props, never> {
  constructor(props: Props) {
    super(props);
    props.model.requestUser(props.userId);
  }

  render(): ReactElement {
    const userState = this.props.model.userMap.get(this.props.userId);
    if (userState === undefined) {
      return div(loadingStyle, "...");
    }
    switch (userState._) {
      case "Requesting":
        return h(
          "div",
          { css: loadingStyle },
          h(Icon, { iconType: "Requesting" })
        );
      case "Unknown":
        return div(loadingStyle, "ユーザーの取得に失敗しました");
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
