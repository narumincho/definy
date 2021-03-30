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
};

export const ProjectPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.useProjectDictResult.requestProjectById(props.projectId);
  }, []);

  const project = props.useProjectDictResult.getProjectByProjectId(
    props.projectId
  );
  if (project === undefined) {
    return <div>プロジェクト読込中</div>;
  }
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
