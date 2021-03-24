import * as React from "react";
import * as d from "../../data";
import { Image } from "../container/Image";
import { Link } from "./Link";
import { css } from "@emotion/css";

const imageHeight = 633 / 4;
const textHeight = 48;

export const ProjectCard: React.VFC<{
  projectId: d.ProjectId;
  projectDict: ReadonlyMap<d.ProjectId, d.Project>;
}> = (props) => {
  const project = props.projectDict.get(props.projectId);
  if (project === undefined) {
    return <div>プロジェクト読込中?</div>;
  }
  return (
    <Link style={loadedStyle} location={d.Location.Project(props.projectId)}>
      <Image
        alt={`${project.name}の画像`}
        width={1024 / 4}
        height={imageHeight}
        imageHash={project.imageHash}
      />
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "32px 1fr",
          gap: 8,
          alignItems: "center",
          padding: 8,
        })}
      >
        <Image
          alt={`${project.name}のアイコン`}
          width={32}
          height={32}
          imageHash={project.imageHash}
        />
        <div>{project.name}</div>
      </div>
    </Link>
  );
};

const loadedStyle = {
  width: 256,
  height: imageHeight + textHeight,
  display: "grid",
  gridTemplateRows: `${imageHeight}px ${textHeight}px`,
};
