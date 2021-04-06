import * as React from "react";
import * as d from "../../data";
import { Editor } from "./Editor";

export type Props = {
  readonly projectId: d.ProjectId;
  readonly getProject: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly language: d.Language;
  readonly onRequestProjectById: (projectId: d.ProjectId) => void;
  readonly onRequestAccount: (accountId: d.AccountId) => void;
};

export const ProjectPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.onRequestProjectById(props.projectId);
  }, []);

  const projectState = props.getProject(props.projectId);
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
    <Editor
      product={{
        headItem: {
          name: "プロジェクト名",
          typeAndValue: { type: "text", value: project.name },
          iconHash: project.iconHash,
        },
        items: [
          {
            name: "画像",
            typeAndValue: {
              type: "image",
              alternativeText: project.name + "の画像",
              value: project.imageHash,
            },
          },
          {
            name: "作成者",
            typeAndValue: {
              type: "account",
              value: project.createAccountId,
            },
          },
          {
            name: "作成日時",
            typeAndValue: {
              type: "time",
              value: project.createTime,
            },
          },
          {
            name: "プロジェクトID",
            typeAndValue: {
              type: "text",
              value: props.projectId,
            },
          },
        ],
      }}
      onJump={props.onJump}
      getAccount={props.getAccount}
      language={props.language}
      onRequestAccount={props.onRequestAccount}
      getProject={props.getProject}
      onRequestProject={props.onRequestProjectById}
    />
  );
};
