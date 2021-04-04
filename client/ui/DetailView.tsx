import * as React from "react";
import * as d from "../../data";
import type { HeadItem, Item, Selection, TypeAndValue } from "./Editor";
import { AccountCard } from "./AccountCard";
import { Image } from "../container/Image";
import { TimeDetail } from "./TimeCard";
import { css } from "@emotion/css";

export type Props = {
  readonly selection: Selection;
  readonly headItem?: HeadItem;
  readonly items: ReadonlyArray<Item>;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly onRequestAccount: (accountId: d.AccountId) => void;
};

export const DetailView: React.VFC<Props> = (props) => {
  switch (props.selection.tag) {
    case "none":
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          選択しているものはない
        </div>
      );
    case "head":
      if (props.headItem === undefined) {
        return (
          <div
            className={css({
              height: "100%",
              overflowX: "hidden",
              overflowY: "scroll",
            })}
          >
            headItemがないのに選択している
          </div>
        );
      }
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          <div
            className={css({
              display: "flex",
              gap: 16,
              alignItems: "center",
            })}
          >
            <div
              className={css({
                fontSize: 24,
              })}
            >
              {props.headItem.item.name}
            </div>
            <TypeView typeAndValue={props.headItem.item.typeAndValue} />
          </div>
          <ValueView
            typeAndValue={props.headItem.item.typeAndValue}
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            onRequestAccount={props.onRequestAccount}
          />
        </div>
      );
    case "icon":
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          アイコンを選択してる
        </div>
      );
    case "content": {
      const item = props.items[props.selection.index];
      return (
        <div
          className={css({
            height: "100%",
            overflowX: "hidden",
            overflowY: "scroll",
          })}
        >
          <div
            className={css({
              display: "flex",
              gap: 16,
              alignItems: "center",
            })}
          >
            <div
              className={css({
                fontSize: 24,
              })}
            >
              {item.name}
            </div>
            <TypeView typeAndValue={item.typeAndValue} />
          </div>
          <ValueView
            typeAndValue={item.typeAndValue}
            getAccount={props.getAccount}
            language={props.language}
            onJump={props.onJump}
            onRequestAccount={props.onRequestAccount}
          />
        </div>
      );
    }
  }
};

const TypeView: React.VFC<{ typeAndValue: TypeAndValue }> = (props) => {
  switch (props.typeAndValue.type) {
    case "number":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          number
        </div>
      );
    case "text":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          text
        </div>
      );
    case "select":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          option(
          {props.typeAndValue.valueList.join(",")})
        </div>
      );
    case "image":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          image
        </div>
      );
    case "account":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          account
        </div>
      );
    case "time":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          time
        </div>
      );
    case "listProject":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          listProject
        </div>
      );
  }
};

const ValueView: React.VFC<{
  typeAndValue: TypeAndValue;
  isBig?: boolean;
  getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  language: d.Language;
  onJump: (urlData: d.UrlData) => void;
  onRequestAccount: (accountId: d.AccountId) => void;
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
    case "account":
      return (
        <AccountCard
          accountId={props.typeAndValue.value}
          getAccount={props.getAccount}
          language={props.language}
          onJump={props.onJump}
          onRequestAccount={props.onRequestAccount}
        />
      );
    case "time":
      return <TimeDetail time={props.typeAndValue.value} />;
    case "listProject":
      return <div>listProject</div>;
  }
};
