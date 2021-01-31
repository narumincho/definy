import {
  Message,
  State,
  TitleAndElement,
  messageLogOut,
} from "./messageAndState";
import { c, div } from "@narumincho/html/source/viewUtil";
import { Element } from "@narumincho/html/source/view";
import { button } from "./button";
import { userCard } from "./user";

export const view = (appInterface: State): TitleAndElement => {
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

const mainView = (appInterface: State): Element<Message> => {
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
