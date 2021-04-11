import * as React from "react";
import * as d from "../../data";
import { ProductSelection, ProductType, ProductValue } from "../editor/product";
import { Type, Value } from "../editor/commonElement";
import { AccountCard } from "./AccountCard";
import { Image } from "../container/Image";
import { TimeDetail } from "./TimeCard";
import { css } from "@emotion/css";

export type Props = {
  readonly selection: ProductSelection | undefined;
  readonly product: ProductValue;
  readonly productType: ProductType;
  readonly getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  readonly language: d.Language;
  readonly onJump: (urlData: d.UrlData) => void;
  readonly onRequestAccount: (accountId: d.AccountId) => void;
};

export const DetailView: React.VFC<Props> = (props) => {
  if (props.selection === undefined) {
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
  }
  switch (props.selection.tag) {
    case "head":
      if (
        props.product.headItem === undefined ||
        props.productType.headItem === undefined
      ) {
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
              {props.productType.headItem.name}
            </div>
            <TypeView type={props.productType.headItem.type} />
          </div>
          <ValueView
            type={props.productType.headItem.type}
            value={props.product.headItem.value}
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
      const item = props.product.items[props.selection.index];
      const itemType = props.productType.items[props.selection.index];
      if (item === undefined || itemType === undefined) {
        return <div>指定した要素が存在しない</div>;
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
              {itemType.name}
            </div>
            <TypeView type={itemType.type} />
          </div>
          <ValueView
            type={itemType.type}
            value={item}
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

const TypeView: React.VFC<{ type: Type }> = (props) => {
  switch (props.type.tag) {
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
          {props.type.valueList.join(",")})
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
    case "project":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          project
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
    case "list":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          list(
          <TypeView type={props.type.listType.elementType} />)
        </div>
      );
    case "product":
      return (
        <div
          className={css({
            color: "#ddd",
          })}
        >
          {props.type.productType.headItem === undefined ? (
            <></>
          ) : (
            <div>
              {props.type.productType.headItem.name}
              <TypeView type={props.type.productType.headItem.type} />
            </div>
          )}
          {props.type.productType.items.map((t) => (
            <div>
              {t.name}
              <TypeView type={t.type} />
            </div>
          ))}
        </div>
      );
  }
};

const ValueView: React.VFC<{
  type: Type;
  value: Value;
  isBig?: boolean;
  getAccount: (
    accountId: d.AccountId
  ) => d.ResourceState<d.Account> | undefined;
  language: d.Language;
  onJump: (urlData: d.UrlData) => void;
  onRequestAccount: (accountId: d.AccountId) => void;
}> = (props) => {
  if (props.type.tag === "number" && props.value.type === "number") {
    return (
      <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
        {props.value.value}
      </div>
    );
  }
  if (props.type.tag === "text" && props.value.type === "text") {
    return (
      <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
        {props.value.value}
      </div>
    );
  }
  if (props.type.tag === "select" && props.value.type === "select") {
    return (
      <div className={css({ fontSize: props.isBig ? 32 : 16 })}>
        {props.type.valueList[props.value.index]}
      </div>
    );
  }
  if (props.type.tag === "image" && props.value.type === "image") {
    return (
      <div
        className={css({
          display: "grid",
          justifyContent: "center",
        })}
      >
        <Image
          imageHash={props.value.value}
          alt={props.value.alternativeText}
          width={512}
          height={316.5}
        />
      </div>
    );
  }
  if (props.type.tag === "account" && props.value.type === "account") {
    return (
      <AccountCard
        accountId={props.value.value}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        onRequestAccount={props.onRequestAccount}
      />
    );
  }
  if (props.type.tag === "project" && props.value.type === "project") {
    return <div>プロジェクト</div>;
  }
  if (props.type.tag === "time" && props.value.type === "time") {
    return <TimeDetail time={props.value.value} />;
  }
  if (props.type.tag === "list" && props.value.type === "list") {
    return (
      <div>
        list / 逆にする, すべて消す, 指定した長さにするなど
        (Definyの関数をいい感じに使えれば)
      </div>
    );
  }
  return (
    <div>
      値と型が違う! 型{JSON.stringify(props.type)} 値
      {JSON.stringify(props.value)}
    </div>
  );
};
