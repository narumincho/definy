/* eslint-disable complexity */
import * as d from "../../data";
import { ListSelection, ListType, ListValue, listUpdate } from "./list";
import {
  ProductSelection,
  ProductType,
  ProductValue,
  productUpdate,
} from "./product";
import { TimeCard, TimeDetail } from "../ui/TimeCard";
import { Image } from "../container/Image";
import { Link } from "../ui/Link";
import { ProjectCard } from "../ui/ProjectCard";
import React from "react";
import { css } from "@emotion/css";
import { maybeMap } from "../../common/util";

export type Selection =
  | {
      tag: "product";
      value: ProductSelection;
    }
  | {
      tag: "list";
      value: ListSelection;
    };

const selectionProduct = (value: ProductSelection): Selection => ({
  tag: "product",
  value,
});
const selectionList = (value: ListSelection): Selection => ({
  tag: "list",
  value,
});

export type Value =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "number";
      value: number;
    }
  | {
      type: "select";
      index: number;
    }
  | {
      type: "image";
      alternativeText: string;
      value: d.ImageHash;
    }
  | {
      type: "account";
      value: d.AccountId;
    }
  | {
      type: "time";
      value: d.Time;
    }
  | {
      type: "project";
      value: d.ProjectId;
    }
  | {
      type: "list";
      value: ListValue;
    }
  | {
      type: "product";
      value: ProductValue;
    };

const listValue = (value: ListValue): Value => ({ type: "list", value });
const productValue = (value: ProductValue): Value => ({
  type: "product",
  value,
});

export type Type =
  | {
      tag: "text";
    }
  | {
      tag: "number";
    }
  | {
      tag: "select";
      valueList: ReadonlyArray<string>;
    }
  | {
      tag: "image";
    }
  | {
      tag: "account";
    }
  | {
      tag: "time";
    }
  | {
      tag: "project";
    }
  | {
      tag: "list";
      listType: ListType;
    }
  | {
      tag: "product";
      productType: ProductType;
    };

export type ElementOperation<ElementSelection, ElementValue, ElementType> = {
  /**
   * 上に移動するときにどのように移動するかどうかを決める
   *
   * @returns `undefined` の場合は, 選択が要素外に出る場合や, 選択が不正であることを表現する.
   * その場合, 基本的に要素自体を選択することが多い
   *
   * デフォルトで `W` キーを押したときの動作
   */
  readonly moveUp: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => ElementSelection | undefined;
  /**
   * 下に移動するときにどのように移動するかどうかを決める
   *
   * @returns `undefined` の場合は, 選択が要素外に出る場合や, 選択が不正であることを表現する.
   * その場合, 基本的に要素自体を選択することが多い
   *
   * デフォルトで `S` キーを押したときの動作
   */
  readonly moveDown: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => ElementSelection | undefined;
  /**
   * 先頭の子要素に移動したときにどういう移動をするかどうかを決める
   * @param selection 選択位置, `undefined`の場合は要素自体が選択されている場合
   * @returns `undefined` の場合は, 選択が不正であることを表現する. 不正であるときは基本的に要素自体を選択することが多い
   *
   * デフォルトで `E` キーを押したときの動作
   */
  readonly moveFirstChild: (
    selection: ElementSelection | undefined,
    value: ElementValue,
    type: ElementType
  ) => ElementSelection | undefined;
  readonly selectionView: React.VFC<{
    readonly selection: ElementSelection | undefined;
    readonly value: ElementValue;
    readonly type: ElementType;
    readonly isBig?: boolean;
    readonly getAccount: (
      accountId: d.AccountId
    ) => d.ResourceState<d.Account> | undefined;
    readonly language: d.Language;
    readonly onJump: (urlData: d.UrlData) => void;
    readonly getProject: (
      projectId: d.ProjectId
    ) => d.ResourceState<d.Project> | undefined;
    readonly onRequestProject: (projectId: d.ProjectId) => void;
    readonly onChangeSelection: (selection: ElementSelection) => void;
  }>;
  readonly detailView: React.VFC<{
    readonly value: ElementValue;
    readonly type: ElementType;
    readonly selection: ElementSelection | undefined;
    readonly getAccount: (
      accountId: d.AccountId
    ) => d.ResourceState<d.Account> | undefined;
    readonly language: d.Language;
    readonly onJump: (urlData: d.UrlData) => void;
    readonly getProject: (
      projectId: d.ProjectId
    ) => d.ResourceState<d.Project> | undefined;
    readonly onRequestProject: (projectId: d.ProjectId) => void;
  }>;
};

export const selectionUp = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  return productUpdate.moveUp(selection, product, productType) ?? selection;
};

export const selectionDown = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  return productUpdate.moveDown(selection, product, productType) ?? selection;
};

export const selectionFirstChild = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  return (
    productUpdate.moveFirstChild(selection, product, productType) ?? selection
  );
};

const moveUp = (
  selection: Selection,
  value: Value,
  type: Type
): Selection | undefined => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return maybeMap(
      listUpdate.moveUp(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return maybeMap(
      productUpdate.moveUp(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
};

const moveDown = (
  selection: Selection,
  value: Value,
  type: Type
): Selection | undefined => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return maybeMap(
      listUpdate.moveDown(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return maybeMap(
      productUpdate.moveDown(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
};

const firstChild = (
  selection: Selection | undefined,
  value: Value,
  type: Type
): Selection | undefined => {
  if (selection === undefined) {
    return firstChildValue(value, type);
  }
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return maybeMap(
      listUpdate.moveFirstChild(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return maybeMap(
      productUpdate.moveFirstChild(
        selection.value,
        value.value,
        type.productType
      ),
      selectionProduct
    );
  }
};

const firstChildValue = (value: Value, type: Type): Selection | undefined => {
  if (value.type === "product" && type.tag === "product") {
    const productSelection = productUpdate.moveFirstChild(
      undefined,
      value.value,
      type.productType
    );
    if (productSelection === undefined) {
      return undefined;
    }
    return {
      tag: "product",
      value: productSelection,
    };
  }
  if (value.type === "list" && type.tag === "list") {
    const listSelection = listUpdate.moveFirstChild(
      undefined,
      value.value,
      type.listType
    );
    if (listSelection === undefined) {
      return undefined;
    }
    return {
      tag: "list",
      value: listSelection,
    };
  }
};

const CommonElementSelectionView: ElementOperation<
  Selection,
  Value,
  Type
>["selectionView"] = (props) => {
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
    const accountResource = props.getAccount(props.value.value);
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
            location: d.Location.Account(props.value.value),
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
  if (props.type.tag === "time" && props.value.type === "time") {
    return <TimeCard time={props.value.value} />;
  }
  if (props.type.tag === "project" && props.value.type === "project") {
    return (
      <ProjectCard
        getProject={props.getProject}
        projectId={props.value.value}
        language={props.language}
        onJump={props.onJump}
        onRequestProjectById={props.onRequestProject}
      />
    );
  }
  if (props.type.tag === "list" && props.value.type === "list") {
    return (
      <listUpdate.selectionView
        type={props.type.listType}
        value={props.value.value}
        isBig={props.isBig}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "list"
            ? props.selection.value
            : undefined
        }
      />
    );
  }
  if (props.type.tag === "product" && props.value.type === "product") {
    return (
      <productUpdate.selectionView
        type={props.type.productType}
        value={props.value.value}
        isBig={props.isBig}
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
        onChangeSelection={(productSelection) =>
          props.onChangeSelection(selectionProduct(productSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "product"
            ? props.selection.value
            : undefined
        }
      />
    );
  }
  return (
    <div>
      値と型が違う! 型{JSON.stringify(props.type)} 値
      {JSON.stringify(props.value)}
    </div>
  );
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

const CommonElementDetailView: ElementOperation<
  Selection,
  Value,
  Type
>["detailView"] = (props) => {
  if (props.type.tag === "number" && props.value.type === "number") {
    return (
      <div
        className={css({
          color: "limegreen",
        })}
      >
        [type: number] {props.value.value}
      </div>
    );
  }
  if (props.type.tag === "text" && props.value.type === "text") {
    return (
      <div
        className={css({
          color: "orange",
        })}
      >
        [type: text] {props.value.value}
      </div>
    );
  }
  if (props.type.tag === "select" && props.value.type === "select") {
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
      <div
        className={css({
          color: "#ddd",
        })}
      >
        account
      </div>
    );
  }
  if (props.type.tag === "project" && props.value.type === "project") {
    return (
      <div
        className={css({
          color: "#ddd",
        })}
      >
        project
      </div>
    );
  }
  if (props.type.tag === "time" && props.value.type === "time") {
    return <TimeDetail time={props.value.value} />;
  }
  if (props.type.tag === "list" && props.value.type === "list") {
    return (
      <listUpdate.detailView
        type={props.type.listType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "list"
            ? props.selection.value
            : undefined
        }
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
      />
    );
  }
  if (props.type.tag === "product" && props.value.type === "product") {
    return (
      <productUpdate.detailView
        type={props.type.productType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "product"
            ? props.selection.value
            : undefined
        }
        getAccount={props.getAccount}
        language={props.language}
        onJump={props.onJump}
        getProject={props.getProject}
        onRequestProject={props.onRequestProject}
      />
    );
  }
  return <div>選択時しているものの構造が壊れている</div>;
};

export const commonElement: ElementOperation<Selection, Value, Type> = {
  moveUp,
  moveDown,
  moveFirstChild: firstChild,
  selectionView: CommonElementSelectionView,
  detailView: CommonElementDetailView,
};
