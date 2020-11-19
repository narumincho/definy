import * as d from "definy-core/source/data";
import { Component, ReactElement, createElement as h } from "react";
import { Image } from "./image";
import { Link } from "./link";
import { Model } from "./model";
import styled from "styled-components";

type Props = {
  readonly model: Model;
  readonly projectId: d.ProjectId;
  readonly className?: string;
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
        return h(Project_, { className: this.props.className }, "Requesting");
      case "Unknown":
        return h(Project_, { className: this.props.className }, "Unknown");
      case "Deleted":
        return h(Project_, { className: this.props.className }, "Deleted");
      case "Loaded": {
        return h(
          ProjectLink,
          {
            theme: "Gray",
            model: this.props.model,
            location: d.Location.Project(this.props.projectId),
            className: this.props.className,
          },
          h(ProjectImage, {
            model: this.props.model,
            imageToken: projectResource.dataWithTime.data.imageHash,
            alternativeText: projectResource.dataWithTime.data.name + "の画像",
            key: "project-image",
          }),
          h(ProjectIconAndName, { key: "icon-and-name" }, [
            h(ProjectIcon, {
              model: this.props.model,
              imageToken: projectResource.dataWithTime.data.iconHash,
              key: "project-icon",
              alternativeText:
                projectResource.dataWithTime.data.name + "のアイコン",
            }),
            projectResource.dataWithTime.data.name,
          ])
        );
      }
    }
  }
}

const Project_ = styled.div({
  width: 256,
});

const ProjectLink = styled(Link)({
  display: "grid",
  gridTemplateRows: "128px 48px",
  width: 256,
});

const ProjectIconAndName = styled.div({
  display: "grid",
  gridTemplateColumns: "32px 1fr",
  gap: 8,
  alignItems: "center",
  padding: 8,
});

const ProjectImage = styled(Image)({
  width: 256,
  height: 128,
  padding: 0,
});

const ProjectIcon = styled(Image)({
  width: 32,
  height: 32,
});
