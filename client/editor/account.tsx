import * as React from "react";
import * as d from "../../data";
import { AccountCard } from "../ui/AccountCard";
import { ElementOperation } from "./commonElement";
import { Image } from "../container/Image";
import { Link } from "../ui/Link";
import { NextIcon } from "../ui/NextIcon";
import { css } from "@emotion/css";

export type AccountSelection = never;

export type AccountValue = {
  readonly accountId: d.AccountId;
};

export type AccountType = {
  readonly canEdit: boolean;
};

const AccountSelectionView: ElementOperation<
  AccountSelection,
  AccountValue,
  AccountType
>["selectionView"] = (props) => {
  const accountResource = props.getAccount(props.value.accountId);
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
        onJump={props.onJump}
        urlData={{
          language: props.language,
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

const AccountDetailView: ElementOperation<
  AccountSelection,
  AccountValue,
  AccountType
>["detailView"] = (props) => {
  return (
    <div>
      <AccountCard
        accountId={props.value.accountId}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestAccount={props.onRequestAccount}
      />
    </div>
  );
};

export const accountOperation: ElementOperation<
  AccountSelection,
  AccountValue,
  AccountType
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: AccountSelectionView,
  detailView: AccountDetailView,
};
