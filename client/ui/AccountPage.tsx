import * as React from "react";
import * as d from "../../data";
import { Editor } from "./Editor";

export type Props = {
  readonly accountId: d.AccountId;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly getProject: (
    projectId: d.ProjectId
  ) => d.ResourceState<d.Project> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly onRequestAccount: (accountId: d.AccountId) => void;
  readonly onRequestProject: (projectId: d.ProjectId) => void;
};

export const AccountPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.onRequestAccount(props.accountId);
  }, []);
  const accountResource = props.getAccount(props.accountId);
  if (accountResource === undefined) {
    return <div>アカウント読み込み準備前</div>;
  }
  if (accountResource._ === "Deleted") {
    return <div>存在しないしないアカウント</div>;
  }
  if (accountResource._ === "Requesting") {
    return <div>アカウント取得中</div>;
  }
  if (accountResource._ === "Unknown") {
    return <div>アカウント取得に失敗</div>;
  }
  const account = accountResource.dataWithTime.data;
  return (
    <Editor
      product={{
        headItem: {
          type: { tag: "text" },
          value: { type: "text", value: account.name },
          name: "アカウント名",
          iconHash: account.imageHash,
        },
        items: [
          {
            name: "自己紹介文",
            type: {
              tag: "text",
            },
            value: {
              type: "text",
              value: account.introduction,
            },
          },
          {
            name: "作成日時",
            type: {
              tag: "time",
            },
            value: {
              type: "time",
              value: account.createTime,
            },
          },
          {
            name: "アカウントId",
            type: {
              tag: "time",
            },
            value: {
              type: "text",
              value: props.accountId,
            },
          },
        ],
      }}
      getAccount={props.getAccount}
      language={props.language}
      onJump={props.onJump}
      onRequestAccount={props.onRequestAccount}
      getProject={props.getProject}
      onRequestProject={props.onRequestProject}
    />
  );
};
