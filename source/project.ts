import * as d from "definy-core/source/data";
import { Component, FunctionComponent, ReactElement } from "react";
import { css, jsx as h } from "@emotion/react";
import { Image } from "./image";
import { Link } from "./link";
import { Model } from "./model";

type Props = {
  readonly model: Model;
  readonly projectId: d.ProjectId;
};

export class Project extends Component<Props, never> {
  constructor(props: Props) {
    super(props);
    props.model.requestProject(props.projectId);
  }

  render(): ReactElement {
    const projectResource = this.props.model.projectMap.get(
      this.props.projectId
    );
    if (projectResource === undefined) {
      return h("div", {}, "...");
    }
    switch (projectResource._) {
      case "Requesting":
        return h("div", { css: containerStyle }, "Requesting");
      case "Unknown":
        return h("div", { css: containerStyle }, "Unknown");
      case "Deleted":
        return h("div", { css: containerStyle }, "Deleted");
      case "Loaded": {
        return h(
          Link,
          {
            theme: "Gray",
            model: this.props.model,
            location: d.Location.Project(this.props.projectId),
            css: css(containerStyle, linkStyle),
          },
          h(ProjectImage, {
            model: this.props.model,
            project: projectResource.dataWithTime.data,
            key: "project-image",
          }),
          h(IconAndName, {
            key: "icon-and-name",
            model: this.props.model,
            project: projectResource.dataWithTime.data,
          })
        );
      }
    }
  }
}

const containerStyle = css({
  width: 256,
});

const linkStyle = css({
  display: "grid",
  gridTemplateRows: "128px 48px",
  width: 256,
});

const ProjectImage: FunctionComponent<{
  model: Model;
  project: d.Project;
}> = (props) =>
  h(Image, {
    model: props.model,
    imageToken: props.project.imageHash,
    alternativeText: props.project.name + "の画像",
    width: 1024 / 4,
    height: 633 / 4,
    isCircle: false,
  });

const IconAndName: FunctionComponent<{
  model: Model;
  project: d.Project;
}> = (props) =>
  h(
    "div",
    {
      css: css({
        display: "grid",
        gridTemplateColumns: "32px 1fr",
        gap: 8,
        alignItems: "center",
        padding: 8,
      }),
    },
    [
      h(Image, {
        model: props.model,
        imageToken: props.project.iconHash,
        alternativeText: props.project.name + "のアイコン",
        width: 32,
        height: 32,
        isCircle: false,
        key: "icon",
      }),
      props.project.name,
    ]
  );
