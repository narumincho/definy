import * as React from "react";
import * as d from "../../localData";
import { ElementOperation } from "./ElementOperation";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";
import { dataTypeOrDataTypeParameterOperation } from "./dataTypeOrDataTypeParameter";
import { neverFunc } from "../../common/util";

export type TypeSelection = {
  readonly index: number;
  readonly typeSelection: TypeSelection | undefined;
};

export type TypeValue = Pick<
  UseDefinyAppResult,
  "typePartResource" | "jump" | "language" | "typePartIdListInProjectResource"
> & {
  readonly type: d.Type;
  readonly projectId: d.ProjectId;
  readonly scopeTypePartId: d.TypePartId;
  readonly onChange: (newType: d.Type) => void;
};

const TypeSelectionView: ElementOperation<
  TypeSelection,
  TypeValue
>["selectionView"] = React.memo(
  ({
    value: { onChange: onChangeType, ...value },
    onChangeSelection,
    selection,
  }) => {
    const onChange = React.useCallback(
      (dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter) => {
        onChangeType({
          input: d.Maybe.Nothing(),
          output: dataTypeOrDataTypeParameter,
        });
      },
      [onChangeType]
    );

    return (
      <div
        className={css({
          display: "flex",
          gap: 8,
        })}
      >
        <div>(入力)</div>
        <div>{`→`}</div>
        <dataTypeOrDataTypeParameterOperation.selectionView
          value={{
            dataTypeOrTypeParameter: value.type.output,
            jump: value.jump,
            language: value.language,
            onChange,
            projectId: value.projectId,
            scopeTypePartId: value.scopeTypePartId,
            typePartIdListInProjectResource:
              value.typePartIdListInProjectResource,
            typePartResource: value.typePartResource,
          }}
          onChangeSelection={onChangeSelection}
          selection={selection}
        />
      </div>
    );
  }
);
TypeSelectionView.displayName = "TypeSelectionView";

type TypeArgumentSelection = TypeSelection | "none" | "self";

const TypeArgument: React.VFC<{
  index: number;
  selection: TypeArgumentSelection;
  name: string;
  value: TypeValue;
  onChangeSelection: (typeSelection: TypeSelection) => void;
}> = React.memo(({ index, selection, value, name, onChangeSelection }) => {
  const onChangeArgumentSelection = React.useCallback(
    (typeSelection: TypeSelection) => {
      onChangeSelection({ index, typeSelection });
    },
    [index, onChangeSelection]
  );
  const onFocus = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onChangeSelection({ index, typeSelection: undefined });
    },
    [index, onChangeSelection]
  );

  return (
    <div
      className={css({
        borderStyle: "solid",
        borderColor: selection === "self" ? "red" : "#333",
        borderWidth: 2,
        padding: 4,
      })}
      tabIndex={0}
      onFocus={onFocus}
    >
      {name}
      <TypeSelectionView
        value={value}
        selection={
          selection !== "self" && selection !== "none" ? selection : undefined
        }
        onChangeSelection={onChangeArgumentSelection}
      />
    </div>
  );
});
TypeArgument.displayName = "TypeArgument";

const TypeDetailView: ElementOperation<TypeSelection, TypeValue>["detailView"] =
  React.memo(({ value: { onChange: onChangeType, ...value }, selection }) => {
    const onChange = React.useCallback(
      (dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter) => {
        onChangeType({
          input: d.Maybe.Nothing(),
          output: dataTypeOrDataTypeParameter,
        });
      },
      [onChangeType]
    );
    return (
      <dataTypeOrDataTypeParameterOperation.detailView
        selection={selection}
        value={{
          dataTypeOrTypeParameter: value.type.output,
          jump: value.jump,
          language: value.language,
          onChange,
          projectId: value.projectId,
          scopeTypePartId: value.scopeTypePartId,
          typePartIdListInProjectResource:
            value.typePartIdListInProjectResource,
          typePartResource: value.typePartResource,
        }}
      />
    );
  });
TypeDetailView.displayName = "TypeDetailView";

export const typeOperation: ElementOperation<TypeSelection, TypeValue> = {
  moveDown: neverFunc,
  moveUp: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TypeSelectionView,
  detailView: TypeDetailView,
};
