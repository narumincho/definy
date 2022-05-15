import * as React from "react";
import * as d from "../../localData";
import { Image, ImageSkeleton } from "./Image";
import { Link } from "./Link";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

const imageWidth = 256;
const imageHeight = 158;
const textHeight = 48;
const cardWidth = imageWidth;
const cardHeight = imageHeight + textHeight;

export type Props = Pick<UseDefinyAppResult, "projectResource" | "language"> & {
  readonly projectId: d.ProjectId;
  readonly onJump: UseDefinyAppResult["jump"];
};

export const ProjectCard: React.FC<Props> = React.memo((props) => {
  React.useEffect(() => {
    props.projectResource.requestToServerIfEmpty(props.projectId);
  }, [props.projectId, props.projectResource]);

  const projectState = props.projectResource.getFromMemoryCache(
    props.projectId
  );
  if (projectState === undefined) {
    return <div>プロジェクトリクエスト準備前</div>;
  }
  if (projectState._ === "Deleted") {
    return <div>存在しないプロジェクト</div>;
  }
  if (projectState._ === "Unknown") {
    return <div>取得に失敗しました</div>;
  }
  if (projectState._ === "Requesting") {
    return <div>取得中</div>;
  }
  const project = projectState.dataWithTime.data;
  return (
    <Link
      style={{
        width: cardWidth,
        height: cardHeight,
        display: "grid",
        gridTemplateRows: `${imageHeight}px ${textHeight}px`,
      }}
      locationAndLanguage={{
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
});
ProjectCard.displayName = "ProjectCard";

export const ProjectCardSkeleton: React.VFC = React.memo(() => {
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
});
ProjectCardSkeleton.displayName = "ProjectCardSkeleton";
