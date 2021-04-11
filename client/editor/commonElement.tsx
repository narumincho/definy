/* eslint-disable complexity */
import * as d from "../../data";
import { ListSelection, ListType, ListValue, listUpdate } from "./list";
import {
  ProductSelection,
  ProductType,
  ProductValue,
  productUpdate,
} from "./product";
import { Image } from "../container/Image";
import { Link } from "../ui/Link";
import { ProjectCard } from "../ui/ProjectCard";
import React from "react";
import { TimeCard } from "../ui/TimeCard";
import { css } from "@emotion/css";

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
  readonly up: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => SelectionUpdateResult<ElementSelection>;
  readonly down: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => SelectionUpdateResult<ElementSelection>;
  readonly firstChild: (
    selection: ElementSelection,
    value: ElementValue,
    type: ElementType
  ) => SelectionUpdateResult<ElementSelection>;
  readonly firstChildValue: (
    value: ElementValue,
    type: ElementType
  ) => ElementSelection | undefined;
  selectionView: React.VFC<{
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
};

export type SelectionUpdateResult<ElementSelection> =
  | {
      tag: "inlineMove";
      selection: ElementSelection;
    }
  | {
      tag: "outside";
    };

const mapSelectionUpdateResult = <Input, Output>(
  result: SelectionUpdateResult<Input>,
  func: (input: Input) => Output
): SelectionUpdateResult<Output> => {
  switch (result.tag) {
    case "inlineMove":
      return {
        tag: "inlineMove",
        selection: func(result.selection),
      };
    case "outside":
      return {
        tag: "outside",
      };
  }
};

export const selectionUp = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  const result = productUpdate.up(selection, product, productType);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

export const selectionDown = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  const result = productUpdate.down(selection, product, productType);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

export const selectionFirstChild = (
  selection: ProductSelection,
  product: ProductValue,
  productType: ProductType
): ProductSelection => {
  const result = productUpdate.firstChild(selection, product, productType);
  if (result.tag === "inlineMove") {
    return result.selection;
  }
  return selection;
};

const up = (
  selection: Selection,
  value: Value,
  type: Type
): SelectionUpdateResult<Selection> => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return mapSelectionUpdateResult(
      listUpdate.up(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return mapSelectionUpdateResult(
      productUpdate.up(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

const down = (
  selection: Selection,
  value: Value,
  type: Type
): SelectionUpdateResult<Selection> => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return mapSelectionUpdateResult(
      listUpdate.down(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return mapSelectionUpdateResult(
      productUpdate.down(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

const firstChild = (
  selection: Selection,
  value: Value,
  type: Type
): SelectionUpdateResult<Selection> => {
  if (
    selection.tag === "list" &&
    value.type === "list" &&
    type.tag === "list"
  ) {
    return mapSelectionUpdateResult(
      listUpdate.firstChild(selection.value, value.value, type.listType),
      selectionList
    );
  }
  if (
    selection.tag === "product" &&
    value.type === "product" &&
    type.tag === "product"
  ) {
    return mapSelectionUpdateResult(
      productUpdate.firstChild(selection.value, value.value, type.productType),
      selectionProduct
    );
  }
  return {
    tag: "outside",
  };
};

const firstChildValue = (value: Value, type: Type): Selection | undefined => {
  if (value.type === "product" && type.tag === "product") {
    const productSelection = productUpdate.firstChildValue(
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
    const listSelection = listUpdate.firstChildValue(
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

const selectionView: ElementOperation<
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

export const commonElement: ElementOperation<Selection, Value, Type> = {
  up,
  down,
  firstChild,
  firstChildValue,
  selectionView,
};
