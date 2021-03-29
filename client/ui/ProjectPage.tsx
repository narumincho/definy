import * as React from "react";
import * as d from "../../data";
import { Image } from "../container/Image";
import { UseProjectDictResult } from "../hook/projectDict";

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
      style={{
        display: "grid",
      }}
    >
      <Image
        alt={`${project.name}の画像`}
        width={512}
        height={316.5}
        imageHash={project.imageHash}
      />
      <div>
        <Image
          alt={`${project.name}のアイコン`}
          width={32}
          height={32}
          imageHash={project.iconHash}
        />
        <div>{project.name}</div>
      </div>
    </div>
  );
};
