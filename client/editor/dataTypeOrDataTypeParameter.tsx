import * as React from "react";
import * as d from "../../localData";
import { listUpdateAt, neverFunc } from "../../common/util";
import { Button } from "../ui/Button";
import { ElementOperation } from "./ElementOperation";
import { Link } from "../ui/Link";
import { OneLineTextEditor } from "../ui/OneLineTextEditor";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

export type DataTypeOrDataTypeParameterSelection = {
  readonly index: number;
  readonly typeSelection: DataTypeOrDataTypeParameterSelection | undefined;
};

export type DataTypeOrDataTypeParameterValue = Pick<
  UseDefinyAppResult,
  "typePartResource" | "language" | "typePartIdListInProjectResource"
> & {
  readonly dataTypeOrTypeParameter: d.DataTypeOrDataTypeParameter;
  readonly projectId: d.ProjectId;
  readonly scopeTypePartId: d.TypePartId;
  readonly onChange: (
    newDataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter
  ) => void;
};

const DataTypeSelectionView: ElementOperation<
  DataTypeOrDataTypeParameterSelection,
  DataTypeOrDataTypeParameterValue
>["selectionView"] = React.memo((props) => {
  const result = getTypePartNameFromDataTypeOrDataTypeParameter(
    props.value.dataTypeOrTypeParameter,
    props.value.typePartResource,
    props.value.scopeTypePartId
  );

  if (
    props.value.dataTypeOrTypeParameter._ === "DataType" &&
    result.type === "inProject" &&
    result.typeParameterNameList.length !==
      props.value.dataTypeOrTypeParameter.dataType.arguments.length
  ) {
    return (
      <div>
        パラメータの個数が違う type:
        {JSON.stringify(props.value.dataTypeOrTypeParameter)}, result:
        {JSON.stringify(result)}
      </div>
    );
  }

  if (
    result.type === "inProject" &&
    props.value.dataTypeOrTypeParameter._ === "DataType"
  ) {
    return (
      <div className={css({ display: "flex", gap: 8 })}>
        <div>{result.name}</div>
        {props.value.dataTypeOrTypeParameter.dataType.arguments.map(
          (t, index) => (
            <TypeArgument
              key={index}
              index={index}
              name={result.typeParameterNameList[index] ?? "???"}
              selection={getTypeArgumentSelection(props.selection, index)}
              value={{ ...props.value, dataTypeOrTypeParameter: t }}
              onChangeSelection={props.onChangeSelection}
            />
          )
        )}
      </div>
    );
  }

  return <div>{result.name}</div>;
});
DataTypeSelectionView.displayName = "DataTypeSelectionView";

type GetTypePartNameFromTypePartResult =
  | {
      readonly type: "inProject";
      readonly name: string;
      readonly typeParameterNameList: ReadonlyArray<string>;
    }
  | {
      readonly type: "none" | "inTypeParameter";
      readonly name: string;
    };

const getTypePartNameFromDataTypeOrDataTypeParameter = (
  dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter,
  typePartResource: UseDefinyAppResult["typePartResource"],
  scopeTypePartId: d.TypePartId
): GetTypePartNameFromTypePartResult => {
  switch (dataTypeOrDataTypeParameter._) {
    case "DataType": {
      return getTypePartNameFromDataTypePartId(
        dataTypeOrDataTypeParameter.dataType.typePartId,
        typePartResource
      );
    }
    case "DataTypeParameter": {
      const scopeTypePart =
        typePartResource.getFromMemoryCache(scopeTypePartId);
      if (scopeTypePart === undefined || scopeTypePart._ !== "Loaded") {
        return {
          type: "none",
          name: "?? scopeError",
        };
      }
      const selectedTypePart =
        scopeTypePart.dataWithTime.data.dataTypeParameterList[
          dataTypeOrDataTypeParameter.int32
        ];
      if (selectedTypePart === undefined) {
        return {
          type: "none",
          name: "?? indexError",
        };
      }
      return {
        type: "inTypeParameter",
        name: selectedTypePart.name,
      };
    }
  }
};

const getTypePartNameFromDataTypePartId = (
  typePartId: d.TypePartId,
  typePartResource: UseDefinyAppResult["typePartResource"]
): GetTypePartNameFromTypePartResult => {
  const resource = typePartResource.getFromMemoryCache(typePartId);
  if (resource === undefined) {
    return { type: "none", name: ".." };
  }
  if (resource._ === "Unknown") {
    return {
      type: "none",
      name: "取得に失敗した",
    };
  }
  if (resource._ === "Deleted") {
    return { type: "none", name: "存在しない" };
  }
  if (resource._ === "Requesting") {
    return { type: "none", name: "取得中..." };
  }
  return {
    type: "inProject",
    name: resource.dataWithTime.data.name,
    typeParameterNameList: resource.dataWithTime.data.dataTypeParameterList.map(
      (parameter) => parameter.name
    ),
  };
};

type TypeArgumentSelection =
  | DataTypeOrDataTypeParameterSelection
  | "none"
  | "self";

const getTypeArgumentSelection = (
  typeSelection: DataTypeOrDataTypeParameterSelection | undefined,
  index: number
): TypeArgumentSelection => {
  if (typeSelection === undefined || typeSelection.index !== index) {
    return "none";
  }
  if (typeSelection.typeSelection === undefined) {
    return "self";
  }
  return typeSelection.typeSelection;
};

const TypeArgument = React.memo(
  ({
    index,
    selection,
    value,
    name,
    onChangeSelection,
  }: {
    readonly index: number;
    readonly selection: TypeArgumentSelection;
    readonly name: string;
    readonly value: DataTypeOrDataTypeParameterValue;
    readonly onChangeSelection: (
      typeSelection: DataTypeOrDataTypeParameterSelection
    ) => void;
  }): React.ReactElement => {
    const onChangeArgumentSelection = React.useCallback(
      (typeSelection: DataTypeOrDataTypeParameterSelection) => {
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
          display: "flex",
          gap: 8,
        })}
        tabIndex={0}
        onFocus={onFocus}
      >
        <div
          className={css({
            fontSize: 14,
          })}
        >
          {name}:
        </div>
        <DataTypeSelectionView
          value={value}
          selection={
            selection !== "self" && selection !== "none" ? selection : undefined
          }
          onChangeSelection={onChangeArgumentSelection}
        />
      </div>
    );
  }
);
TypeArgument.displayName = "TypeArgument";

const DataTypeDetailView: ElementOperation<
  DataTypeOrDataTypeParameterSelection,
  DataTypeOrDataTypeParameterValue
>["detailView"] = React.memo((props) => {
  const [text, setText] = React.useState<string>("");

  React.useEffect(() => {
    props.value.typePartIdListInProjectResource.requestToServerIfEmpty(
      props.value.projectId
    );
  }, [props.value.typePartIdListInProjectResource, props.value.projectId]);

  const onChange = (
    dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter
  ): void => {
    props.value.onChange(
      setTypePartAtSelection(
        props.value.dataTypeOrTypeParameter,
        props.selection,
        dataTypeOrDataTypeParameter
      )
    );
  };

  const onSearchTextChange = (newText: string): void => {
    setText(newText);
    const typePartIdListInProjectResource =
      props.value.typePartIdListInProjectResource.getFromMemoryCache(
        props.value.projectId
      );
    if (
      typePartIdListInProjectResource === undefined ||
      typePartIdListInProjectResource._ !== "Loaded"
    ) {
      return;
    }
    const normalizedNewText = newText.trim().toLocaleLowerCase();
    if (normalizedNewText.length === 0) {
      return;
    }
    const suggestionFirst = generateTypeSuggestion(
      typePartIdListInProjectResource.dataWithTime.data,
      props.value.typePartResource.getFromMemoryCache,
      normalizedNewText
    )[0];
    if (suggestionFirst === undefined) {
      return;
    }
    onChange(
      d.DataTypeOrDataTypeParameter.DataType({
        typePartId: suggestionFirst.typePartId,
        arguments: new Array<d.DataTypeOrDataTypeParameter>(
          suggestionFirst.typeParameterCount
        ).fill(
          d.DataTypeOrDataTypeParameter.DataType({
            arguments: [],
            typePartId: d.Int32.typePartId,
          })
        ),
      })
    );
  };

  return (
    <div>
      <SelectedType
        language={props.value.language}
        dataTypeOrDataTypeParameter={props.value.dataTypeOrTypeParameter}
        typePartResource={props.value.typePartResource}
        scopeTypePartId={props.value.scopeTypePartId}
      />
      <OneLineTextEditor
        id="typeEditorFiler"
        value={text}
        onChange={onSearchTextChange}
      />
      <SearchResult
        normalizedSearchText={text.trim().toLocaleLowerCase()}
        typePartIdListInProject={props.value.typePartIdListInProjectResource.getFromMemoryCache(
          props.value.projectId
        )}
        typePartResource={props.value.typePartResource}
        language={props.value.language}
        selectedDataType={
          props.value.dataTypeOrTypeParameter._ === "DataType"
            ? props.value.dataTypeOrTypeParameter.dataType
            : undefined
        }
        onChange={onChange}
      />
      <DataTypeParameterList
        typePartId={props.value.scopeTypePartId}
        typePartResource={props.value.typePartResource}
        selectedIndex={
          props.value.dataTypeOrTypeParameter._ === "DataTypeParameter"
            ? props.value.dataTypeOrTypeParameter.int32
            : undefined
        }
        onChange={(index: number): void => {
          onChange(d.DataTypeOrDataTypeParameter.DataTypeParameter(index));
        }}
      />
    </div>
  );
});
DataTypeDetailView.displayName = "DataTypeDetailView";

const setTypePartAtSelection = (
  currentType: d.DataTypeOrDataTypeParameter,
  selection: DataTypeOrDataTypeParameterSelection | undefined,
  dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter
): d.DataTypeOrDataTypeParameter => {
  if (selection === undefined || currentType._ === "DataTypeParameter") {
    return dataTypeOrDataTypeParameter;
  }
  return setTypePartAtSelectionDataType(
    currentType.dataType,
    selection,
    dataTypeOrDataTypeParameter
  );
};

const setTypePartAtSelectionDataType = (
  currentType: d.DataType,
  selection: DataTypeOrDataTypeParameterSelection | undefined,
  dataType: d.DataTypeOrDataTypeParameter
): d.DataTypeOrDataTypeParameter => {
  if (selection === undefined) {
    return dataType;
  }
  return d.DataTypeOrDataTypeParameter.DataType({
    typePartId: currentType.typePartId,
    arguments: listUpdateAt(currentType.arguments, selection.index, (t) =>
      setTypePartAtSelection(t, selection.typeSelection, dataType)
    ),
  });
};

const SelectedType = React.memo(
  (
    props: Pick<UseDefinyAppResult, "typePartResource" | "language"> & {
      readonly dataTypeOrDataTypeParameter: d.DataTypeOrDataTypeParameter;
      readonly scopeTypePartId: d.TypePartId;
    }
  ): React.ReactElement => {
    const result = getTypePartNameFromDataTypeOrDataTypeParameter(
      props.dataTypeOrDataTypeParameter,
      props.typePartResource,
      props.scopeTypePartId
    );
    switch (props.dataTypeOrDataTypeParameter._) {
      case "DataType":
        return (
          <div>
            <div className={css({ padding: 8 })}>{result.name} を選択中</div>
            <Link
              locationAndLanguage={{
                language: props.language,
                location: d.Location.TypePart(
                  props.dataTypeOrDataTypeParameter.dataType.typePartId
                ),
              }}
              style={{ padding: 8 }}
            >
              {result.name}のページ
            </Link>
          </div>
        );
      case "DataTypeParameter":
        return (
          <div>
            <div className={css({ padding: 8 })}>{result.name} を選択中</div>
          </div>
        );
    }
  }
);
SelectedType.displayName = "SelectedType";

const SearchResult = React.memo(
  (
    props: Pick<UseDefinyAppResult, "language" | "typePartResource"> & {
      readonly typePartIdListInProject:
        | d.ResourceState<ReadonlyArray<d.TypePartId>>
        | undefined;
      /** 前後の空白を取り除き, 小文字に変換しておく必要がある */
      readonly normalizedSearchText: string;
      readonly selectedDataType: d.DataType | undefined;
      readonly onChange: (t: d.DataTypeOrDataTypeParameter) => void;
    }
  ): React.ReactElement => {
    if (props.typePartIdListInProject === undefined) {
      return <div>プロジェクトに属している型パーツを取得準備中</div>;
    }
    switch (props.typePartIdListInProject._) {
      case "Unknown":
        return <div>取得に失敗した</div>;
      case "Deleted":
        return <div>不明なプロジェクトのため取得に失敗した</div>;
      case "Requesting":
        return <div>取得中</div>;
      case "Loaded": {
        const typePartList = generateTypeSuggestion(
          props.typePartIdListInProject.dataWithTime.data,
          props.typePartResource.getFromMemoryCache,
          props.normalizedSearchText
        );

        return (
          <div>
            {typePartList.slice(0, 20).map((item) => (
              <DataTypeItem
                key={item.typePartId}
                language={props.language}
                name={item.name}
                onChange={() => {
                  props.onChange(
                    d.DataTypeOrDataTypeParameter.DataType({
                      typePartId: item.typePartId,
                      arguments: new Array<d.DataTypeOrDataTypeParameter>(
                        item.typeParameterCount
                      ).fill(
                        d.DataTypeOrDataTypeParameter.DataType({
                          arguments: [],
                          typePartId: d.Int32.typePartId,
                        })
                      ),
                    })
                  );
                }}
                typeParameterCount={item.typeParameterCount}
                typePartId={item.typePartId}
                isSelected={
                  props.selectedDataType?.typePartId === item.typePartId
                }
              />
            ))}
          </div>
        );
      }
    }
  }
);
SearchResult.displayName = "SearchResult";

type SuggestionText = {
  /** 表示する文字 */
  text: string;
  /** 強調表示する文字か */
  isEmphasis: boolean;
};

type TypeSuggestion = {
  typePartId: d.TypePartId;
  name: ReadonlyArray<SuggestionText>;
  typeParameterCount: number;
};

/**
 * 検索文字から最適な候補を生成する
 */
const generateTypeSuggestion = (
  typePartIdList: ReadonlyArray<d.TypePartId>,
  getFromMemoryCache: (
    id_: d.TypePartId
  ) => d.ResourceState<d.TypePart> | undefined,
  normalizedSearchText: string
): ReadonlyArray<TypeSuggestion> => {
  const list = typePartIdList.flatMap<{
    typePartId: d.TypePartId;
    name: ReadonlyArray<SuggestionText>;
    typeParameterCount: number;
    point: number;
  }>((typePartId) => {
    const typePart = getFromMemoryCache(typePartId);
    if (typePart === undefined || typePart._ !== "Loaded") {
      return [];
    }
    const data = typePart.dataWithTime.data;
    const includeIndex = data.name
      .toLocaleLowerCase()
      .indexOf(normalizedSearchText);
    if (includeIndex !== -1) {
      return [
        {
          typePartId,
          name: [
            { text: data.name.slice(0, includeIndex), isEmphasis: false },
            {
              text: data.name.slice(
                includeIndex,
                includeIndex + normalizedSearchText.length
              ),
              isEmphasis: true,
            },
            {
              text: data.name.slice(includeIndex + normalizedSearchText.length),
              isEmphasis: false,
            },
            {
              text: ` ${new Array(data.dataTypeParameterList.length)
                .fill("*")
                .join(" ")}`,
              isEmphasis: false,
            },
          ],
          typeParameterCount: data.dataTypeParameterList.length,
          point: data.name.length - normalizedSearchText.length,
        },
      ];
    }
    return [];
  });
  list.sort((itemA, itemB) => itemA.point - itemB.point);
  return list;
};

/**
 * 型を選択するボタン, ボタンの右に詳細ページへ移動するリンクがある
 */
const DataTypeItem = React.memo(
  ({
    typePartId,
    name,
    language,
    isSelected,
    onChange,
  }: Pick<UseDefinyAppResult, "language"> & {
    readonly typePartId: d.TypePartId;
    readonly name: ReadonlyArray<SuggestionText>;
    readonly typeParameterCount: number;
    readonly onChange: () => void;
    readonly isSelected: boolean;
  }): React.ReactElement => {
    return (
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "1fr auto",
          border: isSelected ? "solid 2px red" : "solid 2px transparent",
        })}
      >
        <Button onClick={onChange}>
          {name.map((suggestionText, index) => (
            <span
              key={index}
              className={css({
                fontWeight: suggestionText.isEmphasis ? "bold" : "normal",
                color: suggestionText.isEmphasis ? "#f0932b" : "inherit",
              })}
            >
              {suggestionText.text}
            </span>
          ))}
        </Button>
        <Link
          locationAndLanguage={{
            language,
            location: d.Location.TypePart(typePartId),
          }}
          style={{
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            className={css({
              padding: 4,
            })}
          >
            →
          </div>
        </Link>
      </div>
    );
  }
);
DataTypeItem.displayName = "DataTypeItem";

const DataTypeParameterList = React.memo(
  (
    props: Pick<UseDefinyAppResult, "typePartResource"> & {
      readonly typePartId: d.TypePartId;
      readonly onChange: (t: number) => void;
      readonly selectedIndex: number | undefined;
    }
  ): React.ReactElement => {
    const typePartResource = props.typePartResource.getFromMemoryCache(
      props.typePartId
    );
    if (typePartResource === undefined) {
      return <div>型の情報の取得待ち</div>;
    }
    switch (typePartResource._) {
      case "Deleted":
      case "Unknown":
      case "Requesting":
        return <div>...</div>;
      case "Loaded": {
        const data = typePartResource.dataWithTime.data;
        if (data.dataTypeParameterList.length === 0) {
          return <div>型パラメータはない</div>;
        }
        return (
          <div>
            <div>型パラメータから</div>
            {data.dataTypeParameterList.map((p, index) => (
              <DataTypeParameterItem
                key={index}
                name={[{ text: p.name, isEmphasis: false }]}
                onChange={() => {
                  props.onChange(index);
                }}
                isSelected={index === props.selectedIndex}
              />
            ))}
          </div>
        );
      }
    }
  }
);
DataTypeParameterList.displayName = "DataTypeParameterList";

/**
 * 型を選択するボタン, ボタンの右に詳細ページへ移動するリンクがある
 */
const DataTypeParameterItem = ({
  isSelected,
  onChange,
  name,
}: {
  readonly name: ReadonlyArray<SuggestionText>;
  readonly onChange: () => void;
  readonly isSelected: boolean;
}): React.ReactElement => {
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "1fr auto",
        border: isSelected ? "solid 2px red" : "solid 2px transparent",
      })}
    >
      <Button onClick={onChange}>
        {name.map((suggestionText, index) => (
          <span
            key={index}
            className={css({
              fontWeight: suggestionText.isEmphasis ? "bold" : "normal",
              color: suggestionText.isEmphasis ? "#f0932b" : "inherit",
            })}
          >
            {suggestionText.text}
          </span>
        ))}
      </Button>
    </div>
  );
};

export const dataTypeOrDataTypeParameterOperation: ElementOperation<
  DataTypeOrDataTypeParameterSelection,
  DataTypeOrDataTypeParameterValue
> = {
  moveDown: neverFunc,
  moveUp: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: DataTypeSelectionView,
  detailView: DataTypeDetailView,
};
