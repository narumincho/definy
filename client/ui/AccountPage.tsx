import * as React from "react";
import * as d from "../../data";
import { Editor } from "./Editor";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<
  UseDefinyAppResult,
  "accountResource" | "projectResource" | "language"
> & {
  readonly accountId: d.AccountId;
  readonly onJump: UseDefinyAppResult["jump"];
};

export const AccountPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.accountResource.forciblyRequestToServer(props.accountId);
  }, []);

  const accountResource = props.accountResource.getFromMemoryCache(
    props.accountId
  );
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
      productType={{
        headItem: {
          textType: { canEdit: false },
          name: "アカウント名",
          hasIcon: true,
        },
        items: [
          {
            name: "自己紹介文",
            type: {
              tag: "text",
              textType: { canEdit: false },
            },
          },
          {
            name: "作成日時",
            type: {
              tag: "time",
              timeType: { canEdit: false },
            },
          },
          {
            name: "アカウントId",
            type: {
              tag: "text",
              textType: { canEdit: false },
            },
          },
        ],
      }}
      product={{
        headItem: {
          value: account.name,
          iconHash: account.imageHash,
        },
        items: [
          {
            type: "text",
            value: account.introduction,
          },
          {
            type: "time",
            value: account.createTime,
          },
          {
            type: "text",
            value: props.accountId,
          },
        ],
      }}
      accountResource={props.accountResource}
      projectResource={props.projectResource}
      language={props.language}
      onJump={props.onJump}
      onRequestDataOperation={() => {}}
    />
  );
};
