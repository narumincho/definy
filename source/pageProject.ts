import * as d from "definy-core/source/data";
import { Component, FunctionComponent, ReactChild, ReactElement } from "react";
import { css, jsx as h } from "@emotion/react";
import { Icon } from "./icon";
import { Image } from "./image";
import { Model } from "./model";
import { TypePartListEditor } from "./typePartListEditor";
import { User } from "./user";

type Props = {
  readonly projectId: d.ProjectId;
  readonly model: Model;
};

export class PageProject extends Component<Props> {
  constructor(props: Props) {
    super(props);
    props.model.requestProject(props.projectId);
    props.model.requestTypePartInProject(props.projectId);
  }

  render(): ReactElement {
    return h(
      "div",
      {
        css: css({
          display: "grid",
          gridTemplateColumns: "1fr",
          gridTemplateRows: "100%",
          justifyItems: "center",
          alignContent: "start",
          height: "100%",
          overflow: "auto",
        }),
      },
      pageContent(this.props)
    );
  }
}

const pageContent = (props: Props): ReactChild => {
  const projectState = props.model.projectMap.get(props.projectId);
  if (projectState === undefined) {
    return "...";
  }
  switch (projectState._) {
    case "Requesting":
      return h(Icon, { iconType: "Requesting" });
    case "Unknown":
      return "?";
    case "Deleted":
      return (
        "現在, projectId が " +
        props.projectId +
        " のプロジェクトは存在しません"
      );
    case "Loaded":
      return h(ProjectMain, {
        model: props.model,
        project: projectState.dataWithTime.data,
        projectId: props.projectId,
      });
  }
};

const ProjectMain: FunctionComponent<{
  model: Model;
  project: d.Project;
  projectId: d.ProjectId;
}> = (props) => {
  return h(
    "div",
    {
      css: css({
        padding: 16,
        display: "grid",
        gap: 4,
        alignContent: "start",
      }),
    },
    [
      h(ProjectIconAndName, {
        key: "iconAndName",
        project: props.project,
        model: props.model,
      }),
      h(Image, {
        imageToken: props.project.imageHash,
        model: props.model,
        key: "project-icon",
        alternativeText: "image",
        width: 1024 / 2,
        height: 633 / 2,
        isCircle: false,
      }),
      h("div", { key: "creator" }, [
        "作成者",
        h(User, {
          model: props.model,
          userId: props.project.createUserId,
          key: "creator-link",
        }),
      ]),
      h(TypePartListEditor, {
        model: props.model,
        projectId: props.projectId,
        key: "typePartListEditor",
      }),
    ]
  );
};

const ProjectIconAndName: FunctionComponent<{
  project: d.Project;
  model: Model;
}> = (props) =>
  h(
    "div",
    {
      key: "iconAndName",
      css: css({
        padding: 8,
        display: "grid",
        alignItems: "center",
        gridTemplateColumns: "48px 1fr",
        gap: 8,
        width: "100%",
        margin: 0,
      }),
    },
    [
      h(Image, {
        imageToken: props.project.iconHash,
        model: props.model,
        key: "icon",
        alternativeText: props.project.name + "のアイコン",
        width: 48,
        height: 48,
        isCircle: false,
      }),
      h("div", { key: "name" }, [props.project.name]),
    ]
  );
