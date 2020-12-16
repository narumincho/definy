import * as d from "definy-core/source/data";
import { AppInterface, Message } from "./appInterface";
import { Component, FunctionComponent, ReactElement } from "react";
import { Image, image } from "./image";
import { Link, link } from "./link";
import { c, div } from "./view/viewUtil";
import { css, jsx as h } from "@emotion/react";
import { Element } from "./view/view";
import { Model } from "./model";

interface Props {
  readonly model: Model;
  readonly projectId: d.ProjectId;
}

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
      return h("div", { css: containerStyle }, "...");
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

const imageHeight = 633 / 4;
const textHeight = 48;

const containerStyle = css({
  width: 256,
  height: imageHeight + textHeight,
});

const linkStyle = css({
  display: "grid",
  gridTemplateRows: `${imageHeight}px ${textHeight}px`,
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
    height: imageHeight,
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

export const projectCard = (
  appInterface: AppInterface,
  projectId: d.ProjectId
): Element<Message> => {
  const projectResource = appInterface.projectMap.get(projectId);
  if (projectResource === undefined) {
    return div({ style }, "...");
  }
  switch (projectResource._) {
    case "Requesting":
      return div({ style }, "Requesting");
    case "Unknown":
      return div({ style }, "Unknown");
    case "Deleted":
      return div({ style }, "Deleted");
    case "Loaded":
      return projectLoaded(
        appInterface,
        projectId,
        projectResource.dataWithTime.data
      );
  }
};

const projectLoaded = (
  appInterface: AppInterface,
  projectId: d.ProjectId,
  project: d.Project
) => {
  return link(
    {
      theme: "Gray",
      appInterface,
      location: d.Location.Project(projectId),
      style: loadedStyle,
    },
    c([
      [
        "image",
        image({
          appInterface,
          imageToken: project.imageHash,
          alternativeText: project.name + "の画像",
          width: 1024 / 4,
          height: imageHeight,
          isCircle: false,
        }),
      ],
      [
        "iconAndName",
        div(
          {
            style: {
              display: "grid",
              gridTemplateColumns: "32px 1fr",
              gap: 8,
              alignItems: "center",
              padding: 8,
            },
          },
          c([
            [
              "icon",
              image({
                appInterface,
                imageToken: project.iconHash,
                alternativeText: project.name + "のアイコン",
                width: 32,
                height: 32,
                isCircle: false,
              }),
            ],
            ["name", div({}, project.name)],
          ])
        ),
      ],
    ])
  );
};

const style = {
  width: 256,
  height: imageHeight + textHeight,
};

const loadedStyle = {
  ...style,
  display: "grid",
  gridTemplateRows: `${imageHeight}px ${textHeight}px`,
};
