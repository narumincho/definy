import * as React from "react";
import * as d from "../../data";
import { AccountCard } from "./AccountCard";
import { Image } from "../container/Image";
import { UseProjectDictResult } from "../hook/projectDict";
import { css } from "@emotion/css";

export type Props = {
  readonly projectId: d.ProjectId;
  readonly useProjectDictResult: UseProjectDictResult;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly language: d.Language;
  readonly onRequestProjectById: (projectId: d.ProjectId) => void;
};

export const ProjectPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.onRequestProjectById(props.projectId);
  }, []);

  const projectState = props.useProjectDictResult.getProjectStateByProjectId(
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
    <div
      className={css({
        display: "grid",
        overflowY: "scroll",
        alignContent: "start",
        gap: 8,
        padding: 16,
        height: "100%",
      })}
    >
      <div
        className={css({
          fontSize: 32,
          display: "grid",
          gridAutoFlow: "column",
          alignItems: "center",
          justifyContent: "start",
          gap: 8,
        })}
      >
        <Image
          alt={`${project.name}のアイコン`}
          width={32}
          height={32}
          imageHash={project.iconHash}
        />
        {project.name}
      </div>
      <div
        className={css({
          display: "grid",
          justifyContent: "center",
          gap: 8,
        })}
      >
        <Image
          alt={`${project.name}の画像`}
          width={512}
          height={316.5}
          imageHash={project.imageHash}
        />
        <AccountCard
          language={props.language}
          onJump={props.onJump}
          accountId={project.createAccountId}
        />
      </div>
    </div>
  );
};
