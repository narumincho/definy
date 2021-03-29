import * as React from "react";
import * as d from "../../data";
import { Image, ImageSkeleton } from "../container/Image";
import { Link } from "./Link";
import { UseProjectDictResult } from "../hook/projectDict";
import { css } from "@emotion/css";

const imageWidth = 256;
const imageHeight = 158;
const textHeight = 48;
const cardWidth = imageWidth;
const cardHeight = imageHeight + textHeight;

export type Props = {
  readonly projectId: d.ProjectId;
  readonly useProjectDictResult: UseProjectDictResult;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly language: d.Language;
};

export const ProjectCard: React.VFC<Props> = (props) => {
  const project = props.useProjectDictResult.getProjectByProjectId(
    props.projectId
  );
  if (project === undefined) {
    return <div>プロジェクト読込中?</div>;
  }
  return (
    <Link
      style={{
        width: cardWidth,
        height: cardHeight,
        display: "grid",
        gridTemplateRows: `${imageHeight}px ${textHeight}px`,
      }}
      urlData={{
        location: d.Location.Project(props.projectId),
        language: props.language,
      }}
      onJump={props.onJump}
    >
      <Image
        alt={`${project.name}の画像`}
        width={imageWidth}
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
          imageHash={project.iconHash}
        />
        <div>{project.name}</div>
      </div>
    </Link>
  );
};

export const ProjectCardSkeleton: React.VFC = () => {
  return (
    <div
      className={css({
        background: "#333",
        width: cardWidth,
        height: cardHeight,
      })}
    >
      <ImageSkeleton width={imageWidth} height={imageHeight} />
    </div>
  );
};
