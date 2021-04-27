/* eslint-disable complexity */
import * as React from "react";
import {
  AccountIdDataOperation,
  AccountIdSelection,
  AccountIdValue,
  accountIdOperation,
} from "./accountId";
import { ButtonDataOperation, ButtonValue, buttonOperation } from "./button";
import { ImageSelection, ImageValue, imageOperation } from "./image";
import {
  ListDataOperation,
  ListSelection,
  ListValue,
  listOperation,
} from "./list";
import {
  NumberDataOperation,
  NumberSelection,
  NumberValue,
  numberOperation,
} from "./number";
import {
  ProductDataOperation,
  ProductSelection,
  ProductValue,
  productOperation,
} from "./product";
import {
  ProjectIdDataOperation,
  ProjectIdSelection,
  ProjectIdValue,
  projectIdOperation,
} from "./projectId";
import { SumDataOperation, SumSelection, SumValue, sumOperation } from "./sum";
import {
  TextDataOperation,
  TextSelection,
  TextValue,
  textOperation,
} from "./text";
import { TimeSelection, TimeValue, timeOperation } from "./time";
import {
  TypePartIdDataOperation,
  TypePartIdSelection,
  TypePartIdValue,
  typePartIdOperation,
} from "./typePartId";
import type { ElementOperation } from "./ElementOperation";
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
      accountSelection: AccountIdSelection;
    }
  | {
      tag: "time";
      timeSelection: TimeSelection;
    }
  | {
      tag: "project";
      projectSelection: ProjectIdSelection;
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
const selectionSum = (sumSelection: SumSelection): Selection => ({
  tag: "sum",
  sumSelection,
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
      type: "accountId";
      value: AccountIdValue;
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
      type: "projectId";
      value: ProjectIdValue;
    }
  | {
      type: "typePartId";
      value: TypePartIdValue;
    }
  | {
      type: "button";
      value: ButtonValue;
    };

export const textValue = (value: TextValue): Value => ({ type: "text", value });
export const numberValue = (value: NumberValue): Value => ({
  type: "number",
  value,
});
export const sumValue = (value: SumValue): Value => ({ type: "sum", value });
export const accountIdValue = (value: AccountIdValue): Value => ({
  type: "accountId",
  value,
});
export const timeValue = (value: TimeValue): Value => ({ type: "time", value });
export const listValue = (value: ListValue): Value => ({ type: "list", value });
export const productValue = (value: ProductValue): Value => ({
  type: "product",
  value,
});
export const imageValue = (value: ImageValue): Value => ({
  type: "image",
  value,
});
export const projectIdValue = (value: ProjectIdValue): Value => ({
  type: "projectId",
  value,
});
export const typePartIdValue = (value: TypePartIdValue): Value => ({
  type: "typePartId",
  value,
});
export const buttonValue = (value: ButtonValue): Value => ({
  type: "button",
  value,
});

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
      accountDataOperation: AccountIdDataOperation;
    }
  | {
      tag: "project";
      projectDataOperation: ProjectIdDataOperation;
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
    }
  | {
      tag: "button";
      buttonDataOperation: ButtonDataOperation;
    };

const moveUp = (selection: Selection, value: Value): Selection | undefined => {
  if (selection.tag === "list" && value.type === "list") {
    return maybeMap(
      listOperation.moveUp(selection.value, value.value),
      selectionList
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return maybeMap(
      productOperation.moveUp(selection.value, value.value),
      selectionProduct
    );
  }
};

const moveDown = (
  selection: Selection,
  value: Value
): Selection | undefined => {
  if (selection.tag === "list" && value.type === "list") {
    return maybeMap(
      listOperation.moveDown(selection.value, value.value),
      selectionList
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return maybeMap(
      productOperation.moveDown(selection.value, value.value),
      selectionProduct
    );
  }
};

const moveFirstChild = (
  selection: Selection | undefined,
  value: Value
): Selection | undefined => {
  if (value.type === "list") {
    return maybeMap(
      listOperation.moveFirstChild(
        selection !== undefined && selection.tag === "list"
          ? selection.value
          : undefined,
        value.value
      ),
      selectionList
    );
  }
  if (value.type === "product") {
    return maybeMap(
      productOperation.moveFirstChild(
        selection !== undefined && selection.tag === "product"
          ? selection.value
          : undefined,
        value.value
      ),
      selectionProduct
    );
  }
};

const moveParent: ElementOperation<
  Selection,
  Value,
  CommonDataOperation
>["moveParent"] = (selection, value) => {
  if (selection.tag === "list" && value.type === "list") {
    return maybeMap(
      listOperation.moveParent(selection.value, value.value),
      selectionList
    );
  }
  if (selection.tag === "product" && value.type === "product") {
    return maybeMap(
      productOperation.moveParent(selection.value, value.value),
      selectionProduct
    );
  }
};

const CommonElementSelectionView: ElementOperation<
  Selection,
  Value,
  CommonDataOperation
>["selectionView"] = (props) => {
  switch (props.value.type) {
    case "number":
      return (
        <numberOperation.selectionView
          value={props.value.value}
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
    case "text":
      return (
        <textOperation.selectionView
          value={props.value.value}
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
    case "sum":
      return (
        <sumOperation.selectionView
          value={props.value.value}
          onChangeSelection={(s) => props.onChangeSelection(selectionSum(s))}
          selection={
            props.selection !== undefined && props.selection.tag === "sum"
              ? props.selection.sumSelection
              : undefined
          }
          onRequestDataOperation={(sumDataOperation) =>
            props.onRequestDataOperation({
              tag: "sum",
              sumDataOperation,
            })
          }
        />
      );
    case "image":
      return (
        <imageOperation.selectionView
          value={props.value.value}
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
    case "accountId":
      return (
        <accountIdOperation.selectionView
          value={props.value.value}
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
    case "time":
      return (
        <timeOperation.selectionView
          value={props.value.value}
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
    case "projectId":
      return (
        <projectIdOperation.selectionView
          value={props.value.value}
          onChangeSelection={(listSelection) =>
            props.onChangeSelection(selectionList(listSelection))
          }
          selection={
            props.selection !== undefined && props.selection.tag === "project"
              ? props.selection.projectSelection
              : undefined
          }
          onRequestDataOperation={(projectDataOperation) =>
            props.onRequestDataOperation({
              tag: "project",
              projectDataOperation,
            })
          }
        />
      );
    case "list":
      return (
        <listOperation.selectionView
          value={props.value.value}
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
    case "product":
      return (
        <productOperation.selectionView
          value={props.value.value}
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
    case "typePartId":
      return (
        <typePartIdOperation.selectionView
          value={props.value.value}
          onChangeSelection={(typePartIdSelection) =>
            props.onChangeSelection(typePartIdSelection)
          }
          selection={
            props.selection !== undefined &&
            props.selection.tag === "typePartId"
              ? props.selection.typePartIdSelection
              : undefined
          }
          onRequestDataOperation={props.onRequestDataOperation}
        />
      );
    case "button":
      return (
        <buttonOperation.selectionView
          value={props.value.value}
          onChangeSelection={() => {}}
          selection={undefined}
          onRequestDataOperation={(buttonDataOperation) =>
            props.onRequestDataOperation({ tag: "button", buttonDataOperation })
          }
        />
      );
  }
};

const CommonElementDetailView: ElementOperation<
  Selection,
  Value,
  CommonDataOperation
>["detailView"] = (props) => {
  switch (props.value.type) {
    case "number":
      return (
        <numberOperation.detailView
          value={props.value.value}
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
    case "text":
      return (
        <textOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "text"
              ? props.selection.textSelection
              : undefined
          }
          onRequestDataOperation={(textDataOperation) =>
            props.onRequestDataOperation({
              tag: "text",
              textDataOperation,
            })
          }
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
          onRequestDataOperation={(sumDataOperation) =>
            props.onRequestDataOperation({
              tag: "sum",
              sumDataOperation,
            })
          }
        />
      );
    case "image":
      return (
        <imageOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "image"
              ? props.selection.imageSelection
              : undefined
          }
          onRequestDataOperation={props.onRequestDataOperation}
        />
      );
    case "accountId":
      return (
        <accountIdOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "account"
              ? props.selection.accountSelection
              : undefined
          }
          onRequestDataOperation={(accountDataOperation) =>
            props.onRequestDataOperation({
              tag: "account",
              accountDataOperation,
            })
          }
        />
      );
    case "projectId":
      return (
        <projectIdOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "project"
              ? props.selection.projectSelection
              : undefined
          }
          onRequestDataOperation={(projectDataOperation) =>
            props.onRequestDataOperation({
              tag: "project",
              projectDataOperation,
            })
          }
        />
      );
    case "time":
      return (
        <timeOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "time"
              ? props.selection.timeSelection
              : undefined
          }
          onRequestDataOperation={props.onRequestDataOperation}
        />
      );
    case "list":
      return (
        <listOperation.detailView
          value={props.value.value}
          selection={
            props.selection !== undefined && props.selection.tag === "list"
              ? props.selection.value
              : undefined
          }
          onRequestDataOperation={(listDataOperation) =>
            props.onRequestDataOperation({
              tag: "list",
              listDataOperation,
            })
          }
        />
      );
    case "product":
      return (
        <productOperation.detailView
          value={props.value.value}
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
          onRequestDataOperation={props.onRequestDataOperation}
        />
      );
    case "button":
      return (
        <buttonOperation.detailView
          value={props.value.value}
          selection={undefined}
          onRequestDataOperation={(buttonDataOperation) => {
            props.onRequestDataOperation({
              tag: "button",
              buttonDataOperation,
            });
          }}
        />
      );
  }
};

export const commonElement: ElementOperation<
  Selection,
  Value,
  CommonDataOperation
> = {
  moveUp,
  moveDown,
  moveFirstChild,
  moveParent,
  selectionView: CommonElementSelectionView,
  detailView: CommonElementDetailView,
};