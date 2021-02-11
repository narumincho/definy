import * as d from "definy-core/source/data";
import { Message, State } from "./messageAndState";
import { c, div } from "@narumincho/html/viewUtil";
import { Element } from "@narumincho/html/view";
import { image } from "./ui/image";
import { link } from "./ui/link";

const imageHeight = 633 / 4;
const textHeight = 48;

export const projectCard = (
  appInterface: State,
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
  appInterface: State,
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
