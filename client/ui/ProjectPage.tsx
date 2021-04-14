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
      productType={{
        headItem: {
          name: "プロジェクト名",
          type: { tag: "text", textType: { canEdit: false } },
          hasIcon: true,
        },
        items: [
          {
            name: "画像",
            type: { tag: "image", imageType: { canEdit: false } },
          },
          {
            name: "作成者",
            type: { tag: "account", accountType: { canEdit: false } },
          },
          {
            name: "作成日時",
            type: { tag: "time" },
          },
          {
            name: "プロジェクトID",
            type: { tag: "text", textType: { canEdit: false } },
          },
        ],
      }}
      product={{
        headItem: {
          value: { type: "text", value: project.name },
          iconHash: project.iconHash,
        },
        items: [
          {
            type: "image",
            value: {
              alternativeText: project.name + "の画像",
              value: project.imageHash,
            },
          },
          {
            type: "account",
            value: { accountId: project.createAccountId },
          },
          {
            type: "time",
            value: project.createTime,
          },
          {
            type: "text",
            value: props.projectId,
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
