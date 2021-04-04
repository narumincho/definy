import * as React from "react";
import * as d from "../../data";
import { Editor } from "./Editor";

export type Props = {
  readonly accountId: d.AccountId;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
};

export const AccountPage: React.VFC<Props> = (props) => {
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
      headItem={{
        item: {
          typeAndValue: { type: "text", value: account.name },
          name: "アカウント名",
        },
        iconHash: account.imageHash,
      }}
      getAccount={props.getAccount}
      items={[
        {
          name: "自己紹介文",
          typeAndValue: {
            type: "text",
            value: account.introduction,
          },
        },
        {
          name: "作成日時",
          typeAndValue: {
            type: "time",
            value: account.createTime,
          },
        },
        {
          name: "アカウントId",
          typeAndValue: {
            type: "text",
            value: props.accountId,
          },
        },
      ]}
      language={props.language}
      onJump={props.onJump}
    />
  );
};
