import * as d from "definy-core/source/data";
import { Component, FunctionComponent, ReactElement } from "react";
import { css, jsx as h } from "@emotion/react";
import { Icon } from "./icon";
import { Link } from "./link";
import { Model } from "./model";
import { Project } from "./project";

export type Props = {
  readonly model: Model;
};

export class PageHome extends Component<Props> {
  /** 初期化 */
  constructor(props: Props) {
    super(props);
    this.props.model.requestAllTop50Project();
  }

  render(): ReactElement {
    return h(
      "div",
      {
        css: css({
          display: "grid",
          overflow: "hidden",
          backgroundColor: "#222",
        }),
      },
      h(HomeMain, { model: this.props.model, key: "main" }),
      this.props.model.logInState._ === "LoggedIn"
        ? h(CreateProjectButton, {
            model: this.props.model,
            key: "create-project-button",
          })
        : undefined
    );
  }
}

const HomeMain: FunctionComponent<{ model: Model }> = (props) => {
  return h(
    "div",
    {
      css: css({
        display: "grid",
        overflowY: "scroll",
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        gridTemplateRows: "32px 1fr",
        gap: 8,
        padding: 16,
      }),
    },
    [
      h(HomeLinkList, { key: "link-list", model: props.model }),
      h(AllProjectList, { key: "all-project-list", model: props.model }),
    ]
  );
};

const HomeLinkList: FunctionComponent<{ model: Model }> = (props) =>
  h(
    "div",
    {
      css: css({
        display: "grid",
        gridAutoFlow: "column",
        justifyContent: "end",
        alignItems: "center",
        height: 32,
        gap: 8,
      }),
    },
    [
      h(HomeLink, {
        model: props.model,
        location: d.Location.About,
        key: "about",
        text: "Definyについて",
      }),
      h(HomeLink, {
        model: props.model,
        location: d.Location.Debug,
        key: "debug",
        text: "デバッグページ",
      }),
    ]
  );

const HomeLink: FunctionComponent<{
  model: Model;
  location: d.Location;
  text: string;
}> = (props) =>
  h(
    Link,
    {
      theme: "Gray",
      model: props.model,
      location: props.location,
      css: css({
        width: 128,
        height: 32,
        display: "grid",
        alignItems: "center",
        justifyContent: "center",
      }),
    },
    props.text
  );

const AllProjectList: FunctionComponent<{
  model: Model;
}> = (props) => {
  switch (props.model.top50ProjectIdState._) {
    case "None":
      return h("div", {}, "読み込み前");
    case "Loading":
      return h("div", {}, h(Icon, { iconType: "Requesting" }));
    case "Loaded": {
      return h(AllProjectListLoaded, {
        projectIdList: props.model.top50ProjectIdState.projectIdList,
        model: props.model,
        key: "loaded",
      });
    }
  }
};

const AllProjectListLoaded: FunctionComponent<{
  projectIdList: ReadonlyArray<d.ProjectId>;
  model: Model;
}> = (props) => {
  if (props.projectIdList.length === 0) {
    return h("div", {}, "プロジェクトが1つもありません");
  }
  return h(
    "div",
    {
      css: css({
        overflow: "hidden",
        overflowWrap: "break-word",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        alignSelf: "start",
        justifySelf: "center",
        gap: 8,
      }),
    },
    props.projectIdList.map((projectId) =>
      h(Project, {
        model: props.model,
        key: projectId,
        projectId,
      })
    )
  );
};

const CreateProjectButton: FunctionComponent<{ model: Model }> = (props) =>
  h(
    "div",
    {
      css: css({
        gridColumn: "1 / 2",
        gridRow: "1 / 2",
        alignSelf: "end",
        justifySelf: "end",
        padding: 16,
      }),
    },
    h(CreateProjectLink, {
      model: props.model,
      key: "link",
    })
  );

const CreateProjectLink: FunctionComponent<{ model: Model }> = (props) =>
  h(
    Link,
    {
      theme: "Active",
      model: props.model,
      location: d.Location.CreateProject,
      css: css({
        padding: 8,
      }),
    },
    createProjectMessage(props.model.language)
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
