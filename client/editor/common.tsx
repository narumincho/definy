/* eslint-disable complexity */
import * as React from "react";
import { AccountIdValue, accountIdOperation } from "./accountId";
import { ButtonValue, buttonOperation } from "./button";
import { IdValue, idOperation } from "./id";
import { ImageValue, imageOperation } from "./image";
import { ListSelection, ListValue, listOperation } from "./list";
import { MultiLineTextValue, multiLineTextOperation } from "./multiLineText";
import { NumberValue, numberOperation } from "./number";
import { OneLineTextValue, oneLineTextOperation } from "./oneLineText";
import { ProductSelection, ProductValue, productOperation } from "./product";
import { ProjectIdValue, projectIdOperation } from "./projectId";
import { SumSelection, SumValue, sumOperation } from "./sum";
import { TimeValue, timeOperation } from "./time";
import {
  TypePartIdSelection,
  TypePartIdValue,
  typePartIdOperation,
} from "./typePartId";
import { TypeSelection, TypeValue, typeOperation } from "./type";
import type { ElementOperation } from "./ElementOperation";
import { maybeMap } from "../../common/util";

export type CommonSelection =
  | {
      readonly tag: "product";
      readonly productSelection: ProductSelection;
    }
  | {
      readonly tag: "list";
      readonly listSelection: ListSelection;
    }
  | {
      readonly tag: "sum";
      readonly sumSelection: SumSelection;
    }
  | {
      readonly tag: "typePartId";
      readonly typePartIdSelection: TypePartIdSelection;
    }
  | {
      readonly tag: "type";
      readonly typeSelection: TypeSelection;
    };

const selectionProduct = (value: ProductSelection): CommonSelection => ({
  tag: "product",
  productSelection: value,
});
const selectionList = (value: ListSelection): CommonSelection => ({
  tag: "list",
  listSelection: value,
});
const selectionSum = (sumSelection: SumSelection): CommonSelection => ({
  tag: "sum",
  sumSelection,
});
const selectionType = (typeSelection: TypeSelection): CommonSelection => ({
  tag: "type",
  typeSelection,
});

export type CommonValue =
  | {
      readonly type: "oneLineText";
      readonly value: OneLineTextValue;
    }
  | {
      readonly type: "multiLineText";
      readonly value: MultiLineTextValue;
    }
  | {
      readonly type: "number";
      readonly value: NumberValue;
    }
  | {
      readonly type: "sum";
      readonly value: SumValue;
    }
  | {
      readonly type: "accountId";
      readonly value: AccountIdValue;
    }
  | {
      readonly type: "time";
      readonly value: TimeValue;
    }
  | {
      readonly type: "list";
      readonly value: ListValue;
    }
  | {
      readonly type: "product";
      readonly value: ProductValue;
    }
  | {
      readonly type: "image";
      readonly value: ImageValue;
    }
  | {
      readonly type: "projectId";
      readonly value: ProjectIdValue;
    }
  | {
      readonly type: "typePartId";
      readonly value: TypePartIdValue;
    }
  | {
      readonly type: "button";
      readonly value: ButtonValue;
    }
  | {
      readonly type: "type";
      readonly value: TypeValue;
    }
  | {
      readonly type: "id";
      readonly value: IdValue;
    };

export const oneLineTextValue = (value: OneLineTextValue): CommonValue => ({
  type: "oneLineText",
  value,
});
export const multiLineTextValue = (value: MultiLineTextValue): CommonValue => ({
  type: "multiLineText",
  value,
});
export const numberValue = (value: NumberValue): CommonValue => ({
  type: "number",
  value,
});
export const sumValue = (value: SumValue): CommonValue => ({
  type: "sum",
  value,
});
export const accountIdValue = (value: AccountIdValue): CommonValue => ({
  type: "accountId",
  value,
});
export const timeValue = (value: TimeValue): CommonValue => ({
  type: "time",
  value,
});
export const listValue = (value: ListValue): CommonValue => ({
  type: "list",
  value,
});
export const productValue = (value: ProductValue): CommonValue => ({
  type: "product",
  value,
});
export const imageValue = (value: ImageValue): CommonValue => ({
  type: "image",
  value,
});
export const projectIdValue = (value: ProjectIdValue): CommonValue => ({
  type: "projectId",
  value,
});
export const typePartIdValue = (value: TypePartIdValue): CommonValue => ({
  type: "typePartId",
  value,
});
export const buttonValue = (value: ButtonValue): CommonValue => ({
  type: "button",
  value,
});
export const typeValue = (value: TypeValue): CommonValue => ({
  type: "type",
  value,
});
export const idValue = (value: IdValue): CommonValue => ({
  type: "id",
  value,
});

const moveUp = (
  selection: CommonSelection,
  value: CommonValue
): CommonSelection => {
  if (selection.tag === "list" && value.type === "list") {
    return selectionList(
      listOperation.moveUp(selection.listSelection, value.value)
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return selectionProduct(
      productOperation.moveUp(selection.productSelection, value.value)
    );
  }
  if (selection.tag === "sum" && value.type === "sum") {
    return selectionSum(
      sumOperation.moveUp(selection.sumSelection, value.value)
    );
  }
  return selection;
};

const moveDown = (
  selection: CommonSelection,
  value: CommonValue
): CommonSelection => {
  if (selection.tag === "list" && value.type === "list") {
    return selectionList(
      listOperation.moveDown(selection.listSelection, value.value)
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return selectionProduct(
      productOperation.moveDown(selection.productSelection, value.value)
    );
  }
  if (selection.tag === "sum" && value.type === "sum") {
    return selectionSum(
      sumOperation.moveDown(selection.sumSelection, value.value)
    );
  }
  return selection;
};

const moveFirstChild = (
  selection: CommonSelection | undefined,
  value: CommonValue
): CommonSelection | undefined => {
  switch (value.type) {
    case "list":
      return maybeMap(
        listOperation.moveFirstChild(
          selection !== undefined && selection.tag === "list"
            ? selection.listSelection
            : undefined,
          value.value
        ),
        selectionList
      );
    case "product":
      return maybeMap(
        productOperation.moveFirstChild(
          selection !== undefined && selection.tag === "product"
            ? selection.productSelection
            : undefined,
          value.value
        ),
        selectionProduct
      );
    case "sum":
      return maybeMap(
        sumOperation.moveFirstChild(
          selection !== undefined && selection.tag === "sum"
            ? selection.sumSelection
            : undefined,
          value.value
        ),
        selectionSum
      );
  }
};

const moveParent: ElementOperation<
  CommonSelection,
  CommonValue
>["moveParent"] = (selection, value) => {
  if (selection.tag === "list" && value.type === "list") {
    return maybeMap(
      listOperation.moveParent(selection.listSelection, value.value),
      selectionList
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return maybeMap(
      productOperation.moveParent(selection.productSelection, value.value),
      selectionProduct
    );
  }
  if (selection.tag === "sum" && value.type === "sum") {
    return maybeMap(
      sumOperation.moveParent(selection.sumSelection, value.value),
      selectionSum
    );
  }
};

const noSelectionDummyFunction = () => {};

const CommonElementSelectionView: ElementOperation<
  CommonSelection,
  CommonValue
>["selectionView"] = React.memo((props) => {
  const onChangeSelection = props.onChangeSelection;

  const sumChangeSelection = React.useCallback(
    (s: SumSelection): void => onChangeSelection(selectionSum(s)),
    [onChangeSelection]
  );
  const listChangeSelection = React.useCallback(
    (listSelection: ListSelection): void =>
      onChangeSelection(selectionList(listSelection)),
    [onChangeSelection]
  );
  const productChangeSelection = React.useCallback(
    (productSelection: ProductSelection): void =>
      onChangeSelection(selectionProduct(productSelection)),
    [onChangeSelection]
  );
  const typeChangeSelection = React.useCallback(
    (selection: TypeSelection): void =>
      onChangeSelection(selectionType(selection)),
    [onChangeSelection]
  );

  switch (props.value.type) {
    case "number":
      return (
        <numberOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "oneLineText":
      return (
        <oneLineTextOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "multiLineText":
      return (
        <multiLineTextOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "sum":
      return (
        <sumOperation.selectionView
          value={props.value.value}
          onChangeSelection={sumChangeSelection}
          selection={
            props.selection !== undefined && props.selection.tag === "sum"
              ? props.selection.sumSelection
              : undefined
          }
        />
      );
    case "image":
      return (
        <imageOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "accountId":
      return (
        <accountIdOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "time":
      return (
        <timeOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "projectId":
      return (
        <projectIdOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "list":
      return (
        <listOperation.selectionView
          value={props.value.value}
          onChangeSelection={listChangeSelection}
          selection={
            props.selection !== undefined && props.selection.tag === "list"
              ? props.selection.listSelection
              : undefined
          }
        />
      );
    case "product":
      return (
        <productOperation.selectionView
          value={props.value.value}
          onChangeSelection={productChangeSelection}
          selection={
            props.selection !== undefined && props.selection.tag === "product"
              ? props.selection.productSelection
              : undefined
          }
        />
      );
    case "typePartId":
      return (
        <typePartIdOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "button":
      return (
        <buttonOperation.selectionView
          value={props.value.value}
          onChangeSelection={noSelectionDummyFunction}
          selection={undefined}
        />
      );
    case "type":
      return (
        <typeOperation.selectionView
          value={props.value.value}
          onChangeSelection={typeChangeSelection}
          selection={
            props.selection?.tag === "type"
              ? props.selection.typeSelection
              : undefined
          }
        />
      );
    case "id":
      return (
        <idOperation.selectionView
          value={props.value.value}
          onChangeSelection={typeChangeSelection}
          selection={undefined}
        />
      );
  }
});
CommonElementSelectionView.displayName = "CommonElementSelectionView";

const CommonElementDetailView: ElementOperation<
  CommonSelection,
  CommonValue
>["detailView"] = React.memo((props) => {
  switch (props.value.type) {
    case "number":
      return (
        <numberOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "oneLineText":
      return (
        <oneLineTextOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "multiLineText":
      return (
        <multiLineTextOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "sum":
      return (
        <sumOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "sum"
              ? props.selection.sumSelection
              : undefined
          }
        />
      );
    case "image":
      return (
        <imageOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "accountId":
      return (
        <accountIdOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "projectId":
      return (
        <projectIdOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "time":
      return (
        <timeOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "list":
      return (
        <listOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "list"
              ? props.selection.listSelection
              : undefined
          }
        />
      );
    case "product":
      return (
        <productOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "product"
              ? props.selection.productSelection
              : undefined
          }
        />
      );
    case "typePartId":
      return (
        <typePartIdOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined &&
            props.selection.tag === "typePartId"
              ? props.selection.typePartIdSelection
              : undefined
          }
        />
      );
    case "button":
      return (
        <buttonOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
    case "type":
      return (
        <typeOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "type"
              ? props.selection.typeSelection
              : undefined
          }
        />
      );
    case "id":
      return (
        <idOperation.detailView
          value={props.value.value}
          selection={undefined}
        />
      );
  }
});
CommonElementDetailView.displayName = "CommonElementDetailView";

export const commonElement: ElementOperation<CommonSelection, CommonValue> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: CommonElementSelectionView,
  detailView: CommonElementDetailView,
};
