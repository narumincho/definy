import * as React from "react";
import * as d from "../../data";
import { oneLineTextValue, timeValue } from "../editor/common";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.accountId]);

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
          value: { text: account.name, onChange: undefined },
          iconHash: account.imageHash,
        },
        items: [
          {
            name: "自己紹介文",
            value: oneLineTextValue({
              text: account.introduction,
              onChange: undefined,
            }),
          },
          {
            name: "作成日時",
            value: timeValue({ canEdit: false, time: account.createTime }),
          },
          {
            name: "アカウントId",
            value: oneLineTextValue({
              text: props.accountId,
              onChange: undefined,
            }),
          },
        ],
      }}
    />
  );
};
