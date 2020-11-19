import * as d from "definy-core/source/data";
import {
  Component,
  FunctionComponent,
  ReactElement,
  createElement as h,
} from "react";
import { Icon } from "./icon";
import { Link } from "./link";
import { Model } from "./model";
import { Project } from "./project";
import styled from "styled-components";

export type Props = {
  readonly model: Model;
  readonly className?: string;
};

export class PageHome extends Component<Props> {
  /** 初期化 */
  constructor(props: Props) {
    super(props);
    this.props.model.requestAllTop50Project();
  }

  render(): ReactElement {
    return h(
      PageHome_,
      { className: this.props.className },
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

const PageHome_ = styled.div({
  display: "grid",
  overflow: "hidden",
  backgroundColor: "#222",
});

const HomeMain: FunctionComponent<{ model: Model }> = (props) => {
  return h(HomeMain_, {}, [
    h(HomeLinkList, { key: "link-list", model: props.model }),
    h(AllProjectList, { key: "all-project-list", model: props.model }),
  ]);
};

const HomeMain_ = styled.div({
  display: "grid",
  overflowY: "scroll",
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  gridTemplateRows: "32px 1fr",
  gap: 8,
  padding: 16,
});

const HomeLinkList: FunctionComponent<{ model: Model }> = (props) =>
  h(HomeLinkList_, {}, [
    h(
      HomeLink,
      {
        theme: "Gray",
        model: props.model,
        location: d.Location.About,
        key: "about",
      },
      ["Definyについて"]
    ),
    h(
      HomeLink,
      {
        theme: "Gray",
        model: props.model,
        location: d.Location.Debug,
        key: "debug",
      },
      ["デバッグページ"]
    ),
  ]);

export const HomeLinkList_ = styled.div({
  display: "grid",
  gridAutoFlow: "column",
  justifyContent: "end",
  alignItems: "center",
  height: 32,
  gap: 8,
});

const HomeLink = styled(Link)({
  width: 128,
  height: 32,
  display: "grid",
  alignItems: "center",
  justifyContent: "center",
});

const AllProjectList: FunctionComponent<{
  model: Model;
}> = (props) => {
  switch (props.model.top50ProjectIdState._) {
    case "None":
      return h("div", {}, "読み込み前");
    case "Loading":
      return h("div", {}, h(Icon, { iconType: "Requesting" }));
    case "Loaded": {
      const { projectIdList } = props.model.top50ProjectIdState;
      if (projectIdList.length === 0) {
        return h("div", {}, ["プロジェクトが1つもありません"]);
      }
      return h(
        ProjectList,
        {},
        projectIdList.map((projectId) =>
          h(Project, {
            model: props.model,
            key: projectId,
            projectId,
          })
        )
      );
    }
  }
};

const ProjectList = styled.div({
  overflow: "hidden",
  overflowWrap: "break-word",
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  alignSelf: "start",
  justifySelf: "center",
  gap: 8,
});

const CreateProjectButton: FunctionComponent<{ model: Model }> = (props) =>
  h(
    CreateProjectButton_,
    {},
    h(
      CreateProjectLink,
      {
        theme: "Active",
        model: props.model,
        location: d.Location.CreateProject,
      },
      [createProjectMessage(props.model.language)]
    )
  );

const CreateProjectButton_ = styled.div({
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  alignSelf: "end",
  justifySelf: "end",
  padding: 16,
});

const CreateProjectLink = styled(Link)({
  padding: 8,
});

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
