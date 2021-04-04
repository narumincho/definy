import * as React from "react";
import * as d from "../../data";
import type { HeadItem, Item, Selection, TypeAndValue } from "./Editor";
import { Image } from "../container/Image";
import { Link } from "./Link";
import { TimeCard } from "./TimeCard";
import { css } from "@emotion/css";

export type Props = {
  readonly selection: Selection;
  readonly onChangeSelection: (selection: Selection) => void;
  readonly headItem: HeadItem;
  readonly items: ReadonlyArray<Item>;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
};

export const SelectionView: React.VFC<Props> = (props) => {
  return (
    <div
      className={css({
        display: "grid",
        gap: 4,
        alignContent: "start",
        padding: 8,
        height: "100%",
        overflowX: "hidden",
        overflowY: "scroll",
      })}
    >
      <div
        className={css({
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateColumns:
            props.headItem.iconHash === undefined ? "1fr" : "auto 1fr",
        })}
      >
        {props.headItem.iconHash === undefined ? (
          <></>
        ) : (
          <div
            className={css({
              display: "grid",
              placeContent: "center",
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: props.selection.tag === "icon" ? "red" : "#222",
              borderRadius: 8,
            })}
            onClick={() => {
              props.onChangeSelection({
                tag: "icon",
              });
            }}
          >
            <Image
              width={32}
              height={32}
              alt="タイトルのアイコン"
              imageHash={props.headItem.iconHash}
            />
          </div>
        )}
        <ItemView
          isSelect={props.selection.tag === "head"}
          onSelect={() => {
            props.onChangeSelection({ tag: "head" });
          }}
          item={props.headItem.item}
          isHead
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
        />
      </div>
      {props.items.map((item, index) => (
        <ItemView
          key={item.name}
          isSelect={
            props.selection.tag === "content" && props.selection.index === index
          }
          onSelect={() => {
            props.onChangeSelection({ tag: "content", index });
          }}
          item={item}
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
        />
      ))}
    </div>
  );
};

const ItemView: React.VFC<{
  readonly isSelect: boolean;
  readonly onSelect: () => void;
  readonly item: Item;
  readonly isHead?: boolean;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
}> = (props) => {
  return (
    <div
      className={css({
        padding: 4,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: props.isSelect ? "red" : "#222",
        borderRadius: 8,
      })}
      onClick={() => {
        props.onSelect();
      }}
    >
      <div
        className={css({
          display: "flex",
          gap: 16,
          alignItems: "center",
        })}
      >
        {props.isHead ? (
          <></>
        ) : (
          <div
            className={css({
              fontWeight: "bold",
              fontSize: 16,
              color: "#ddd",
            })}
          >
            {props.item.name}
          </div>
        )}
      </div>
      <ValueView
        typeAndValue={props.item.typeAndValue}
        isBig={props.isHead}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
      />
    </div>
  );
};

const ValueView: React.VFC<{
  typeAndValue: TypeAndValue;
  isBig?: boolean;
  getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  language: d.Language;
  onJump: (urlData: d.UrlData) => void;
}> = (props) => {
  switch (props.typeAndValue.type) {
    case "number":
      return (
        <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
          {props.typeAndValue.value}
        </div>
      );
    case "text":
      return (
        <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
          {props.typeAndValue.value}
        </div>
      );
    case "select":
      return (
        <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
          {props.typeAndValue.valueList[props.typeAndValue.index]}
        </div>
      );
    case "image":
      return (
        <div
          className={css({
            display: "grid",
            justifyContent: "center",
          })}
        >
          <Image
            imageHash={props.typeAndValue.value}
            alt={props.typeAndValue.alternativeText}
            width={512}
            height={316.5}
          />
        </div>
      );
    case "account": {
      const accountResource = props.getAccount(props.typeAndValue.value);
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
              location: d.Location.Account(props.typeAndValue.value),
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
    }
    case "time":
      return <TimeCard time={props.typeAndValue.value} />;
  }
};

const NextIcon: React.VFC<Record<string, string>> = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    color="#000"
  >
    <path d="M0 0h24v24H0z" fill="none"></path>
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
  </svg>
);
