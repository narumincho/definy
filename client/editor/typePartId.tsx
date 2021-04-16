import * as React from "react";
import * as d from "../../data";
import { ElementOperation } from "./commonElement";

export type TypePartIdSelection = never;
export type TypePartIdValue = d.TypePartId;
export type TypePartIdType = {
  readonly canEdit: boolean;
};

const TypePartIdSelectionView: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue,
  TypePartIdType
>["selectionView"] = () => {
  return <div>型パーツ</div>;
};

const TypePartIdDetailView: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue,
  TypePartIdType
>["detailView"] = () => {
  return <div>検索欄と, 候補の選択肢</div>;
};

export const typePartIdOperation: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue,
  TypePartIdType
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TypePartIdSelectionView,
  detailView: TypePartIdDetailView,
};
