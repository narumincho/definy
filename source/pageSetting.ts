import {
  AppInterface,
  Message,
  TitleAndElement,
  messageLogOut,
} from "./appInterface";
import { c, div, elementMap } from "./view/viewUtil";
import { Element } from "./view/view";
import { button } from "./button";
import { userCard } from "./user";

export const view = (appInterface: AppInterface): TitleAndElement => {
  return {
    title: "設定画面",
    element: div(
      {},
      c([
        [
          "text",
          div(
            {
              style: {
                fontSize: 32,
              },
            },
            "設定画面"
          ),
        ],
        ["main", mainView(appInterface)],
      ])
    ),
  };
};

const mainView = (appInterface: AppInterface): Element<Message> => {
  if (appInterface.logInState._ !== "LoggedIn") {
    return div({}, "ログインしていないと特に設定する設定がありません...");
  }
  return div(
    {},
    c([
      [
        "logOutButton",
        button(
          {
            click: {
              tag: messageLogOut,
            },
          },
          "ログアウト"
        ),
      ],
      ["loggedInAccountText", div({}, "ログインしているアカウント")],
      [
        "loggedInAccount",
        userCard(
          appInterface,
          appInterface.logInState.accountTokenAndUserId.userId
        ),
      ],
    ])
  );
};
