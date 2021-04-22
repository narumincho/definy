import * as React from "react";
import * as d from "../../data";
import { AccountCard } from "../ui/AccountCard";
import type { ElementOperation } from "./ElementOperation";
import { Image } from "../ui/Image";
import { Link } from "../ui/Link";
import { NextIcon } from "../ui/NextIcon";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

export type AccountIdSelection = never;

export type AccountIdValue = {
  readonly accountId: d.AccountId;
  readonly canEdit: boolean;
} & Pick<UseDefinyAppResult, "accountResource" | "language" | "jump">;

export type AccountIdDataOperation = {
  tag: "jump";
};

const AccountIdSelectionView: ElementOperation<
  AccountIdSelection,
  AccountIdValue,
  AccountIdDataOperation
>["selectionView"] = (props) => {
  React.useEffect(() => {
    props.value.accountResource.requestToServerIfEmpty(props.value.accountId);
  }, [props.value.accountId]);

  const accountResource = props.value.accountResource.getFromMemoryCache(
    props.value.accountId
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
    <div
      className={css({
        display: "grid",
        gridAutoFlow: "column",
        alignItems: "center",
        padding: 8,
      })}
    >
      <Image
        imageHash={account.imageHash}
        width={32}
        height={32}
        alt={account.name + "の画像"}
        isCircle
      />
      <div>{account.name}</div>
      <Link
        onJump={props.value.jump}
        urlData={{
          language: props.value.language,
          location: d.Location.Account(props.value.accountId),
        }}
        style={{
          display: "grid",
          gridAutoFlow: "column",
          alignItems: "center",
          padding: 8,
        }}
      >
        <NextIcon />
      </Link>
    </div>
  );
};

const AccountIdDetailView: ElementOperation<
  AccountIdSelection,
  AccountIdValue,
  AccountIdDataOperation
>["detailView"] = (props) => {
  return (
    <div>
      <AccountCard
        accountId={props.value.accountId}
        language={props.value.language}
        onJump={props.value.jump}
        accountResource={props.value.accountResource}
      />
    </div>
  );
};

export const accountIdOperation: ElementOperation<
  AccountIdSelection,
  AccountIdValue,
  AccountIdDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: AccountIdSelectionView,
  detailView: AccountIdDetailView,
};
