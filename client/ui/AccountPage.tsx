import * as React from "react";
import * as d from "../../data";
import { Editor } from "./Editor";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<
  UseDefinyAppResult,
  "accountResource" | "projectResource" | "language" | "typePartResource"
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
      product={{
        headItem: {
          name: "アカウント名",
          value: { canEdit: false, text: account.name },
          iconHash: account.imageHash,
        },
        items: [
          {
            name: "自己紹介文",
            value: {
              type: "text",
              value: { canEdit: false, text: account.introduction },
            },
          },
          {
            name: "作成日時",
            value: {
              type: "time",
              value: { canEdit: false, time: account.createTime },
            },
          },
          {
            name: "アカウントId",
            value: {
              type: "text",
              value: { canEdit: false, text: props.accountId },
            },
          },
        ],
      }}
      accountResource={props.accountResource}
      projectResource={props.projectResource}
      typePartResource={props.typePartResource}
      language={props.language}
      onJump={props.onJump}
      onRequestDataOperation={() => {}}
    />
  );
};
