/* eslint-disable complexity */
import * as d from "../../data";
import { ListSelection, ListType, ListValue, listOperation } from "./list";
import {
  NumberSelection,
  NumberType,
  NumberValue,
  numberOperation,
} from "./number";
import {
  ProductSelection,
  ProductType,
  ProductValue,
  productOperation,
} from "./product";
import { SumSelection, SumType, SumValue, sumOperation } from "./sum";
import { TextSelection, TextType, TextValue, textOperation } from "./text";
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
    }
  | {
      tag: "text";
      textSelection: TextSelection;
    }
  | {
      tag: "number";
      numberSelection: NumberSelection;
    }
  | {
      tag: "sum";
      sumSelection: SumSelection;
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
      value: TextValue;
    }
  | {
      type: "number";
      value: NumberValue;
    }
  | {
      type: "sum";
      value: SumValue;
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
      textType: TextType;
    }
  | {
      tag: "number";
      numberType: NumberType;
    }
  | {
      tag: "sum";
      sumType: SumType;
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

  /**
   * 親にどのように移動するかを決める
   *
   * @param selection 選択位置
   * @returns `undefined` の場合は, 選択が要素外に出る場合や, 選択が不正であることを表現する.
   * その場合, 基本的に要素自体を選択することが多い
   *
   * デフォルトで `Q` キーを押したときの動作
   */
  readonly moveParent: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => ElementSelection | undefined;

  /**
   * 左側の選択の木構造のコンポーネント
   */
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

  /**
   * 右側に表示される詳細コンポーネント
   */
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
  return productOperation.moveUp(selection, product, productType) ?? selection;
};

export const selectionDown = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  return (
    productOperation.moveDown(selection, product, productType) ?? selection
  );
};

export const selectionFirstChild = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  return (
    productOperation.moveFirstChild(selection, product, productType) ??
    selection
  );
};

export const selectionParent = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  return (
    productOperation.moveParent(selection, product, productType) ?? selection
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
      listOperation.moveUp(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return maybeMap(
      productOperation.moveUp(selection.value, value.value, type.productType),
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
      listOperation.moveDown(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return maybeMap(
      productOperation.moveDown(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
};

const moveFirstChild = (
  selection: Selection | undefined,
  value: Value,
  type: Type
): Selection | undefined => {
  if (value.type === "list" && type.tag === "list") {
    return maybeMap(
      listOperation.moveFirstChild(
        selection !== undefined && selection.tag === "list"
          ? selection.value
          : undefined,
        value.value,
        type.listType
      ),
      selectionList
    );
  }
  if (value.type === "product" && type.tag === "product") {
    return maybeMap(
      productOperation.moveFirstChild(
        selection !== undefined && selection.tag === "product"
          ? selection.value
          : undefined,
        value.value,
        type.productType
      ),
      selectionProduct
    );
  }
};

const moveParent: ElementOperation<Selection, Value, Type>["moveParent"] = (
  selection,
  value,
  type
) => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return maybeMap(
      listOperation.moveParent(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return maybeMap(
      productOperation.moveParent(
        selection.value,
        value.value,
        type.productType
      ),
      selectionProduct
    );
  }
};

const CommonElementSelectionView: ElementOperation<
  Selection,
  Value,
  Type
>["selectionView"] = (props) => {
  if (props.type.tag === "number" && props.value.type === "number") {
    return (
      <numberOperation.selectionView
        type={props.type.numberType}
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
          props.selection !== undefined && props.selection.tag === "number"
            ? props.selection.numberSelection
            : undefined
        }
      />
    );
  }
  if (props.type.tag === "text" && props.value.type === "text") {
    return (
      <textOperation.selectionView
        type={props.type.textType}
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
          props.selection !== undefined && props.selection.tag === "text"
            ? props.selection.textSelection
            : undefined
        }
      />
    );
  }
  if (props.type.tag === "sum" && props.value.type === "sum") {
    return (
      <sumOperation.selectionView
        type={props.type.sumType}
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
          props.selection !== undefined && props.selection.tag === "sum"
            ? props.selection.sumSelection
            : undefined
        }
      />
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
      <listOperation.selectionView
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
      <productOperation.selectionView
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
      <numberOperation.detailView
        type={props.type.numberType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "number"
            ? props.selection.numberSelection
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
  if (props.type.tag === "text" && props.value.type === "text") {
    return (
      <textOperation.detailView
        type={props.type.textType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "text"
            ? props.selection.textSelection
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
  if (props.type.tag === "sum" && props.value.type === "sum") {
    return (
      <sumOperation.detailView
        type={props.type.sumType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "sum"
            ? props.selection.sumSelection
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
      <listOperation.detailView
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
      <productOperation.detailView
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
  moveFirstChild,
  moveParent,
  selectionView: CommonElementSelectionView,
  detailView: CommonElementDetailView,
};
