import * as d from "definy-core/source/data";
import { Component, ReactElement, createElement as h } from "react";
import { Icon } from "./icon";
import { Image } from "./image";
import { Link } from "./link";
import { Model } from "./model";
import styled from "styled-components";

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
      return h(LoadingDiv, {}, "...");
    }
    switch (userState._) {
      case "Requesting":
        return h(LoadingDiv, {}, h(Icon, { iconType: "Requesting" }));
      case "Unknown":
        return h(LoadingDiv, {}, "ユーザーの取得に失敗しました");
      case "Deleted":
        return h(
          LoadingDiv,
          {},
          "現在, userIdが " + this.props.userId + " のユーザーは存在しません"
        );
      case "Loaded": {
        const { data } = userState.dataWithTime;
        return h(
          StyledUser,
          {
            model: this.props.model,
            theme: "Gray",
            location: d.Location.User(this.props.userId),
          },
          [
            h(UserIcon, {
              imageToken: data.imageHash,
              model: this.props.model,
              key: "image",
              alternativeText: data.name + "のアイコン",
            }),
            data.name,
          ]
        );
      }
    }
  }
}

const LoadingDiv = styled.div({
  display: "grid",
  height: 48,
  alignItems: "center",
  gap: 8,
  padding: 8,
});

const StyledUser = styled(Link)({
  display: "grid",
  gridTemplateColumns: "32px 1fr",
  height: 48,
  alignItems: "center",
  gap: 8,
  padding: 8,
});

const UserIcon = styled(Image)({
  width: 32,
  height: 32,
  borderRadius: "50%",
});
