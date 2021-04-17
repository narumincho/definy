import * as React from "react";
import * as d from "../../data";
import { Image } from "../container/Image";
import { Link } from "./Link";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<UseDefinyAppResult, "language" | "accountResource"> & {
  readonly accountId: d.AccountId;
  readonly onJump: UseDefinyAppResult["jump"];
};

export const AccountCard: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.accountResource.requestToServerIfEmpty(props.accountId);
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
    <Link
      onJump={props.onJump}
      urlData={{
        language: props.language,
        location: d.Location.Account(props.accountId),
      }}
      style={{
        display: "grid",
        gridAutoFlow: "column",
        alignItems: "center",
        padding: 8,
      }}
    >
      <Image
        imageHash={account.imageHash}
        width={32}
        height={32}
        alt={account.name + "の画像"}
        isCircle
      />
      {account.name}
    </Link>
  );
};
