import * as d from "definy-core/source/data";
import {
  AppInterface,
  Message,
  TitleAndElement,
  messageGetUserTag,
} from "./appInterface";
import { c, div } from "./view/viewUtil";
import { image } from "./image";

export const init = (
  messageHandler: (message: Message) => void,
  userId: d.UserId
): void => {
  messageHandler({
    tag: messageGetUserTag,
    userId,
  });
};

export const view = (
  appInterface: AppInterface,
  userId: d.UserId
): TitleAndElement => {
  const user = appInterface.userMap.get(userId);
  if (user === undefined) {
    return {
      title: "... アカウント",
      element: div({}, "ユーザーページを準備中"),
    };
  }
  switch (user._) {
    case "Deleted":
      return {
        title: "存在しないアカウント",
        element: div(
          {},
          "ユーザーIDが " + userId + " のユーザーは現在存在しません"
        ),
      };
    case "Requesting":
      return {
        title: "... アカウント",
        element: div({}, "ユーザーIDが " + userId + " のユーザーを取得中"),
      };
    case "Unknown":
      return {
        title: "不明なアカウント",
        element: div({}, "ユーザーを取得することができなかった"),
      };
    case "Loaded": {
      return {
        title: user.dataWithTime.data.name,
        element: div(
          {},
          c([
            ["id", div({}, userId)],
            [
              "icon",
              image({
                alternativeText:
                  user.dataWithTime.data.name + "のアカウント画像",
                width: 32,
                height: 32,
                appInterface,
                imageToken: user.dataWithTime.data.imageHash,
                isCircle: true,
              }),
            ],
            ["name", div({}, user.dataWithTime.data.name)],
            ["introduction", div({}, user.dataWithTime.data.introduction)],
          ])
        ),
      };
    }
  }
};
