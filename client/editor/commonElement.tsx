/* eslint-disable complexity */
import * as d from "../../data";
import {
  AccountDataOperation,
  AccountSelection,
  AccountType,
  AccountValue,
  accountOperation,
} from "./account";
import { ImageSelection, ImageType, ImageValue, imageOperation } from "./image";
import {
  ListDataOperation,
  ListSelection,
  ListType,
  ListValue,
  listOperation,
} from "./list";
import {
  NumberDataOperation,
  NumberSelection,
  NumberType,
  NumberValue,
  numberOperation,
} from "./number";
import {
  ProductDataOperation,
  ProductSelection,
  ProductType,
  ProductValue,
  productOperation,
} from "./product";
import {
  ProjectDataOperation,
  ProjectSelection,
  ProjectType,
  ProjectValue,
  projectOperation,
} from "./project";
import {
  SumDataOperation,
  SumSelection,
  SumType,
  SumValue,
  sumOperation,
} from "./sum";
import {
  TextDataOperation,
  TextSelection,
  TextType,
  TextValue,
  textOperation,
} from "./text";
import { TimeSelection, TimeType, TimeValue, timeOperation } from "./time";
import {
  TypePartIdDataOperation,
  TypePartIdSelection,
  TypePartIdType,
  TypePartIdValue,
  typePartIdOperation,
} from "./typePartId";
import React from "react";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
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
    }
  | {
      tag: "image";
      imageSelection: ImageSelection;
    }
  | {
      tag: "account";
      accountSelection: AccountSelection;
    }
  | {
      tag: "time";
      timeSelection: TimeSelection;
    }
  | {
      tag: "project";
      projectSelection: ProjectSelection;
    }
  | {
      tag: "typePartId";
      typePartIdSelection: TypePartIdSelection;
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
      type: "account";
      value: AccountValue;
    }
  | {
      type: "time";
      value: TimeValue;
    }
  | {
      type: "list";
      value: ListValue;
    }
  | {
      type: "product";
      value: ProductValue;
    }
  | {
      type: "image";
      value: ImageValue;
    }
  | {
      type: "project";
      value: ProjectValue;
    }
  | {
      type: "typePartId";
      value: TypePartIdValue;
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
      imageType: ImageType;
    }
  | {
      tag: "account";
      accountType: AccountType;
    }
  | {
      tag: "time";
      timeType: TimeType;
    }
  | {
      tag: "project";
      projectType: ProjectType;
    }
  | {
      tag: "list";
      listType: ListType;
    }
  | {
      tag: "product";
      productType: ProductType;
    }
  | {
      tag: "typePartId";
      typePartId: TypePartIdType;
    };

export type CommonDataOperation =
  | {
      tag: "text";
      textDataOperation: TextDataOperation;
    }
  | {
      tag: "number";
      numberDataOperation: NumberDataOperation;
    }
  | {
      tag: "sum";
      sumDataOperation: SumDataOperation;
    }
  | {
      tag: "account";
      accountDataOperation: AccountDataOperation;
    }
  | {
      tag: "project";
      projectDataOperation: ProjectDataOperation;
    }
  | {
      tag: "list";
      listDataOperation: ListDataOperation;
    }
  | {
      tag: "product";
      productDataOperation: ProductDataOperation;
    }
  | {
      tag: "typePartId";
      typePartIdDataOperation: TypePartIdDataOperation;
    };

export type ElementOperation<
  ElementSelection,
  ElementValue,
  ElementType,
  ElementDataOperation
> = {
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
  readonly selectionView: React.VFC<
    Pick<
      UseDefinyAppResult,
      "accountResource" | "projectResource" | "language"
    > & {
      readonly selection: ElementSelection | undefined;
      readonly value: ElementValue;
      readonly type: ElementType;
      readonly onJump: UseDefinyAppResult["jump"];
      readonly onChangeSelection: (selection: ElementSelection) => void;
      readonly onRequestDataOperation: (
        operation: ElementDataOperation
      ) => void;
    }
  >;

  /**
   * 右側に表示される詳細コンポーネント
   */
  readonly detailView: React.VFC<
    Pick<
      UseDefinyAppResult,
      "accountResource" | "projectResource" | "language"
    > & {
      readonly value: ElementValue;
      readonly type: ElementType;
      readonly selection: ElementSelection | undefined;
      readonly onJump: UseDefinyAppResult["jump"];
      readonly onRequestDataOperation: (
        operation: ElementDataOperation
      ) => void;
    }
  >;
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

const moveParent: ElementOperation<
  Selection,
  Value,
  Type,
  CommonDataOperation
>["moveParent"] = (selection, value, type) => {
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
  Type,
  CommonDataOperation
>["selectionView"] = (props) => {
  if (props.type.tag === "number" && props.value.type === "number") {
    return (
      <numberOperation.selectionView
        type={props.type.numberType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "number"
            ? props.selection.numberSelection
            : undefined
        }
        onRequestDataOperation={(numberDataOperation) =>
          props.onRequestDataOperation({ tag: "number", numberDataOperation })
        }
      />
    );
  }
  if (props.type.tag === "text" && props.value.type === "text") {
    return (
      <textOperation.selectionView
        type={props.type.textType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "text"
            ? props.selection.textSelection
            : undefined
        }
        onRequestDataOperation={(textDataOperation) =>
          props.onRequestDataOperation({ tag: "text", textDataOperation })
        }
      />
    );
  }
  if (props.type.tag === "sum" && props.value.type === "sum") {
    return (
      <sumOperation.selectionView
        type={props.type.sumType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "sum"
            ? props.selection.sumSelection
            : undefined
        }
        onRequestDataOperation={props.onRequestDataOperation}
      />
    );
  }
  if (props.type.tag === "image" && props.value.type === "image") {
    return (
      <imageOperation.selectionView
        type={props.type.imageType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "image"
            ? props.selection.imageSelection
            : undefined
        }
        onRequestDataOperation={props.onRequestDataOperation}
      />
    );
  }
  if (props.type.tag === "account" && props.value.type === "account") {
    return (
      <accountOperation.selectionView
        type={props.type.accountType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "account"
            ? props.selection.accountSelection
            : undefined
        }
        onRequestDataOperation={(accountDataOperation) => {
          props.onRequestDataOperation({
            tag: "account",
            accountDataOperation,
          });
        }}
      />
    );
  }
  if (props.type.tag === "time" && props.value.type === "time") {
    return (
      <timeOperation.selectionView
        type={props.type.timeType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "time"
            ? props.selection.timeSelection
            : undefined
        }
        onRequestDataOperation={props.onRequestDataOperation}
      />
    );
  }
  if (props.type.tag === "project" && props.value.type === "project") {
    return (
      <projectOperation.selectionView
        type={props.type.projectType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "project"
            ? props.selection.projectSelection
            : undefined
        }
        onRequestDataOperation={(projectDataOperation) =>
          props.onRequestDataOperation({ tag: "project", projectDataOperation })
        }
      />
    );
  }
  if (props.type.tag === "list" && props.value.type === "list") {
    return (
      <listOperation.selectionView
        type={props.type.listType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(listSelection) =>
          props.onChangeSelection(selectionList(listSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "list"
            ? props.selection.value
            : undefined
        }
        onRequestDataOperation={(listDataOperation) =>
          props.onRequestDataOperation({ tag: "list", listDataOperation })
        }
      />
    );
  }
  if (props.type.tag === "product" && props.value.type === "product") {
    return (
      <productOperation.selectionView
        type={props.type.productType}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(productSelection) =>
          props.onChangeSelection(selectionProduct(productSelection))
        }
        selection={
          props.selection !== undefined && props.selection.tag === "product"
            ? props.selection.value
            : undefined
        }
        onRequestDataOperation={(productDataOperation) =>
          props.onRequestDataOperation({
            tag: "product",
            productDataOperation,
          })
        }
      />
    );
  }
  if (props.type.tag === "typePartId" && props.value.type === "typePartId") {
    return (
      <typePartIdOperation.selectionView
        type={props.type.typePartId}
        value={props.value.value}
        accountResource={props.accountResource}
        language={props.language}
        onJump={props.onJump}
        projectResource={props.projectResource}
        onChangeSelection={(typePartIdSelection) =>
          props.onChangeSelection(typePartIdSelection)
        }
        selection={
          props.selection !== undefined && props.selection.tag === "typePartId"
            ? props.selection.typePartIdSelection
            : undefined
        }
        onRequestDataOperation={props.onRequestDataOperation}
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

const CommonElementDetailView: ElementOperation<
  Selection,
  Value,
  Type,
  CommonDataOperation
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
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={(numberDataOperation) =>
          props.onRequestDataOperation({ tag: "number", numberDataOperation })
        }
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
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={(textDataOperation) =>
          props.onRequestDataOperation({
            tag: "text",
            textDataOperation,
          })
        }
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
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    );
  }
  if (props.type.tag === "image" && props.value.type === "image") {
    return (
      <imageOperation.detailView
        type={props.type.imageType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "image"
            ? props.selection.imageSelection
            : undefined
        }
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    );
  }
  if (props.type.tag === "account" && props.value.type === "account") {
    return (
      <accountOperation.detailView
        type={props.type.accountType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "account"
            ? props.selection.accountSelection
            : undefined
        }
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={(accountDataOperation) =>
          props.onRequestDataOperation({ tag: "account", accountDataOperation })
        }
      />
    );
  }
  if (props.type.tag === "project" && props.value.type === "project") {
    return (
      <projectOperation.detailView
        type={props.type.projectType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "project"
            ? props.selection.projectSelection
            : undefined
        }
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={(projectDataOperation) =>
          props.onRequestDataOperation({ tag: "project", projectDataOperation })
        }
      />
    );
  }
  if (props.type.tag === "time" && props.value.type === "time") {
    return (
      <timeOperation.detailView
        type={props.type.timeType}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "time"
            ? props.selection.timeSelection
            : undefined
        }
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    );
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
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={(listDataOperation) =>
          props.onRequestDataOperation({
            tag: "list",
            listDataOperation,
          })
        }
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
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={(productDataOperation) =>
          props.onRequestDataOperation({
            tag: "product",
            productDataOperation,
          })
        }
      />
    );
  }
  if (props.type.tag === "typePartId" && props.value.type === "typePartId") {
    return (
      <typePartIdOperation.detailView
        type={props.type.typePartId}
        value={props.value.value}
        selection={
          props.selection !== undefined && props.selection.tag === "typePartId"
            ? props.selection.typePartIdSelection
            : undefined
        }
        accountResource={props.accountResource}
        projectResource={props.projectResource}
        language={props.language}
        onJump={props.onJump}
        onRequestDataOperation={props.onRequestDataOperation}
      />
    );
  }
  return <div>選択時しているものの構造が壊れている</div>;
};

export const commonElement: ElementOperation<
  Selection,
  Value,
  Type,
  CommonDataOperation
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: CommonElementSelectionView,
  detailView: CommonElementDetailView,
};
