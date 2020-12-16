import * as d from "definy-core/source/data";
import {
  AppInterface,
  Message,
  TitleAndElement,
  messageGetTop50Project,
} from "./appInterface";
import { c, div } from "./view/viewUtil";
import { Element } from "./view/view";
import { Model } from "./model";
import { icon } from "./icon";
import { link } from "./link";
import { projectCard } from "./project";

export const init = (messageHandler: (message: Message) => void): void => {
  messageHandler({
    tag: messageGetTop50Project,
  });
};

export const view = (appInterface: AppInterface): TitleAndElement => {
  return {
    title: "",
    element: div(
      {
        style: {
          display: "grid",
          overflow: "hidden",
          backgroundColor: "#222",
        },
      },
      c([
        ["main", homeMain(appInterface)],
        ...(appInterface.logInState._ === "LoggedIn"
          ? ([
              ["createProjectButton", CreateProjectButton(appInterface)],
            ] as const)
          : []),
      ])
    ),
  };
};

export interface Props {
  readonly model: Model;
}

const homeMain = (appInterface: AppInterface): Element<Message> => {
  return div(
    {
      style: {
        display: "grid",
        overflowY: "scroll",
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        gridTemplateRows: "32px 1fr",
        gap: 8,
        padding: 16,
      },
    },
    c([
      ["linkList", homeLinkList(appInterface)],
      ["projectList", AllProjectList(appInterface)],
    ])
  );
};

const homeLinkList = (appInterface: AppInterface): Element<Message> =>
  div(
    {
      style: {
        display: "grid",
        gridAutoFlow: "column",
        justifyContent: "end",
        alignItems: "center",
        height: 32,
        gap: 8,
      },
    },
    c([
      ["about", homeLink(appInterface, d.Location.About, "Definyについて")],
      ["debug", homeLink(appInterface, d.Location.Debug, "デバッグページ")],
    ])
  );

const homeLink = (
  appInterface: AppInterface,
  location: d.Location,
  text: string
): Element<Message> =>
  link(
    {
      theme: "Gray",
      appInterface,
      location,
      style: {
        width: 128,
        height: 32,
        display: "grid",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    text
  );

const AllProjectList = (appInterface: AppInterface): Element<Message> => {
  switch (appInterface.top50ProjectIdState._) {
    case "None":
      return div({}, "読み込み前");
    case "Loading":
      return div({}, c([["requestingIcon", icon("Requesting")]]));
    case "Loaded": {
      return AllProjectListLoaded(
        appInterface,
        appInterface.top50ProjectIdState.projectIdList
      );
    }
  }
};

const AllProjectListLoaded = (
  appInterface: AppInterface,
  projectIdList: ReadonlyArray<d.ProjectId>
): Element<Message> => {
  if (projectIdList.length === 0) {
    return div({}, "プロジェクトが1つもありません");
  }
  return div(
    {
      style: {
        overflow: "hidden",
        overflowWrap: "break-word",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignSelf: "start",
        justifySelf: "center",
        gap: 8,
      },
    },
    c(
      projectIdList.map(
        (projectId) =>
          [projectId, projectCard(appInterface, projectId)] as const
      )
    )
  );
};

const CreateProjectButton = (appInterface: AppInterface): Element<Message> =>
  div(
    {
      style: {
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        alignSelf: "end",
        justifySelf: "end",
        padding: 16,
      },
    },
    c([
      [
        "link",
        link(
          {
            theme: "Active",
            appInterface,
            location: d.Location.CreateProject,
            style: {
              padding: 8,
            },
          },
          createProjectMessage(appInterface.language)
        ),
      ],
    ])
  );

const createProjectMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return "Create a new project";
    case "Esperanto":
      return "Krei novan projekton";
    case "Japanese":
      return "プロジェクトを新規作成";
  }
};
