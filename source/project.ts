import * as d from "definy-core/source/data";
import { Component, ReactElement } from "react";
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
          h(Image, {
            model: this.props.model,
            imageToken: projectResource.dataWithTime.data.imageHash,
            alternativeText: projectResource.dataWithTime.data.name + "の画像",
            key: "project-image",
            css: css({
              width: 256,
              height: 128,
              padding: 0,
            }),
          }),
          h(
            "div",
            {
              key: "icon-and-name",
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
                model: this.props.model,
                imageToken: projectResource.dataWithTime.data.iconHash,
                key: "project-icon",
                alternativeText:
                  projectResource.dataWithTime.data.name + "のアイコン",
                css: css({
                  width: 32,
                  height: 32,
                }),
              }),
              projectResource.dataWithTime.data.name,
            ]
          )
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
