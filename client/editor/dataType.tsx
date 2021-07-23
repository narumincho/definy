import * as React from "react";
import * as d from "../../localData";
import { listUpdateAt, neverFunc } from "../../common/util";
import { Button } from "../ui/Button";
import { ElementOperation } from "./ElementOperation";
import { Link } from "../ui/Link";
import { OneLineTextEditor } from "../ui/OneLineTextEditor";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";

export type DataTypeSelection = {
  readonly index: number;
  readonly typeSelection: DataTypeSelection | undefined;
};

export type DataTypeValue = Pick<
  UseDefinyAppResult,
  "typePartResource" | "jump" | "language" | "typePartIdListInProjectResource"
> & {
  readonly dataType: d.DataType;
  readonly projectId: d.ProjectId;
  readonly scopeTypePartId: d.TypePartId;
  readonly onChange: (newDataType: d.DataType) => void;
};

const DataTypeSelectionView: ElementOperation<
  DataTypeSelection,
  DataTypeValue
>["selectionView"] = React.memo((props) => {
  React.useEffect(() => {
    props.value.typePartResource.requestToServerIfEmpty(
      props.value.dataType.typePartId
    );
  }, [props.value.dataType.typePartId, props.value.typePartResource]);

  const result = getTypePartNameFromTypePartId(
    props.value.dataType.typePartId,
    props.value.typePartResource,
    props.value.scopeTypePartId
  );

  if (
    result.typeParameterNameList.length !==
    props.value.dataType.arguments.length
  ) {
    return (
      <div>
        パラメータの個数が違う type:{JSON.stringify(props.value.dataType)},
        result:{JSON.stringify(result)}
      </div>
    );
  }

  if (props.value.dataType.arguments.length === 0) {
    return <div>{result.name}</div>;
  }

  return (
    <div>
      <div>{result.name}</div>
      {props.value.dataType.arguments.map((t, index) => (
        <TypeArgument
          key={index}
          index={index}
          name={result.typeParameterNameList[index] ?? "???"}
          selection={getTypeArgumentSelection(props.selection, index)}
          value={{ ...props.value, dataType: t }}
          onChangeSelection={props.onChangeSelection}
        />
      ))}
    </div>
  );
});
DataTypeSelectionView.displayName = "DataTypeSelectionView";

type GetTypePartNameFromTypePartResult = {
  type: "inProject" | "none" | "inTypeParameter";
  name: string;
  typeParameterNameList: ReadonlyArray<string>;
};

const getTypePartNameFromTypePartId = (
  typePartId: d.TypePartId,
  typePartResource: UseDefinyAppResult["typePartResource"],
  scopeTypePartId: d.TypePartId
): GetTypePartNameFromTypePartResult => {
  const scopeTypePart = typePartResource.getFromMemoryCache(scopeTypePartId);
  if (scopeTypePart === undefined || scopeTypePart._ !== "Loaded") {
    return { type: "none", name: "???", typeParameterNameList: [] };
  }
  const selectedTypePart =
    scopeTypePart.dataWithTime.data.dataTypeParameterList.find(
      (param) => param.typePartId === typePartId
    );
  if (selectedTypePart === undefined) {
    const resource = typePartResource.getFromMemoryCache(typePartId);
    if (resource === undefined) {
      return { type: "none", name: "..", typeParameterNameList: [] };
    }
    if (resource._ === "Unknown") {
      return {
        type: "none",
        name: "取得に失敗した",
        typeParameterNameList: [],
      };
    }
    if (resource._ === "Deleted") {
      return { type: "none", name: "存在しない", typeParameterNameList: [] };
    }
    if (resource._ === "Requesting") {
      return { type: "none", name: "取得中...", typeParameterNameList: [] };
    }
    return {
      type: "inProject",
      name: resource.dataWithTime.data.name,
      typeParameterNameList:
        resource.dataWithTime.data.dataTypeParameterList.map(
          (parameter) => parameter.name
        ),
    };
  }
  return {
    type: "inTypeParameter",
    name: selectedTypePart.name,
    typeParameterNameList: [],
  };
};

type TypeArgumentSelection = DataTypeSelection | "none" | "self";

const getTypeArgumentSelection = (
  typeSelection: DataTypeSelection | undefined,
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

const TypeArgument: React.VFC<{
  index: number;
  selection: TypeArgumentSelection;
  name: string;
  value: DataTypeValue;
  onChangeSelection: (typeSelection: DataTypeSelection) => void;
}> = React.memo(({ index, selection, value, name, onChangeSelection }) => {
  const onChangeArgumentSelection = React.useCallback(
    (typeSelection: DataTypeSelection) => {
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
      <DataTypeSelectionView
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

const DataTypeDetailView: ElementOperation<
  DataTypeSelection,
  DataTypeValue
>["detailView"] = React.memo((props) => {
  const [text, setText] = React.useState<string>("");
  React.useEffect(() => {
    props.value.typePartResource.requestToServerIfEmpty(
      props.value.dataType.typePartId
    );
  }, [props.value.dataType.typePartId, props.value.typePartResource]);

  React.useEffect(() => {
    props.value.typePartIdListInProjectResource.requestToServerIfEmpty(
      props.value.projectId
    );
  }, [props.value.typePartIdListInProjectResource, props.value.projectId]);

  const onChange = (dataType: d.DataType): void => {
    props.value.onChange(
      setTypePartAtSelection(props.value.dataType, props.selection, dataType)
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
    onChange({
      typePartId: suggestionFirst.typePartId,
      arguments: new Array<d.DataType>(suggestionFirst.typeParameterCount).fill(
        {
          arguments: [],
          typePartId: d.Int32.typePartId,
        }
      ),
    });
  };

  return (
    <div>
      <SelectedType
        language={props.value.language}
        jump={props.value.jump}
        typePartId={props.value.dataType.typePartId}
        typePartResource={props.value.typePartResource}
        scopeTypePartId={props.value.scopeTypePartId}
      />
      <OneLineTextEditor
        id="typeEditorFiler"
        value={text}
        onChange={onSearchTextChange}
      />
      <SearchResult
        jump={props.value.jump}
        normalizedSearchText={text.trim().toLocaleLowerCase()}
        typePartIdListInProject={props.value.typePartIdListInProjectResource.getFromMemoryCache(
          props.value.projectId
        )}
        typePartResource={props.value.typePartResource}
        language={props.value.language}
        selectedTypePartId={props.value.dataType.typePartId}
        onChange={onChange}
      />
      <DataTypeParameterList
        language={props.value.language}
        jump={props.value.jump}
        typePartId={props.value.scopeTypePartId}
        typePartResource={props.value.typePartResource}
        selectedTypePartId={props.value.dataType.typePartId}
        onChange={onChange}
      />
    </div>
  );
});
DataTypeDetailView.displayName = "DataTypeDetailView";

const setTypePartAtSelection = (
  currentType: d.DataType,
  selection: DataTypeSelection | undefined,
  type: d.DataType
): d.DataType => {
  if (selection === undefined) {
    return type;
  }
  return {
    typePartId: currentType.typePartId,
    arguments: listUpdateAt(currentType.arguments, selection.index, (t) =>
      setTypePartAtSelection(t, selection.typeSelection, type)
    ),
  };
};

const SelectedType: React.VFC<
  Pick<UseDefinyAppResult, "typePartResource" | "jump" | "language"> & {
    typePartId: d.TypePartId;
    scopeTypePartId: d.TypePartId;
  }
> = React.memo((props) => {
  const result = getTypePartNameFromTypePartId(
    props.typePartId,
    props.typePartResource,
    props.scopeTypePartId
  );
  return (
    <div>
      <div className={css({ padding: 8 })}>{result.name} を選択中</div>
      {result.type === "inTypeParameter" ? (
        <></>
      ) : (
        <Link
          onJump={props.jump}
          urlData={{
            language: props.language,
            location: d.Location.TypePart(props.typePartId),
          }}
          style={{ padding: 8 }}
        >
          {result.name}のページ
        </Link>
      )}
    </div>
  );
});
SelectedType.displayName = "SelectedType";

const SearchResult: React.VFC<
  Pick<UseDefinyAppResult, "language" | "typePartResource" | "jump"> & {
    typePartIdListInProject:
      | d.ResourceState<ReadonlyArray<d.TypePartId>>
      | undefined;
    /** 前後の空白を取り除き, 小文字に変換しておく必要がある */
    normalizedSearchText: string;
    selectedTypePartId: d.TypePartId;
    onChange: (t: d.DataType) => void;
  }
> = React.memo((props) => {
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
              jump={props.jump}
              language={props.language}
              name={item.name}
              onChange={props.onChange}
              dataType={{
                typePartId: item.typePartId,
                arguments: new Array<d.DataType>(item.typeParameterCount).fill({
                  arguments: [],
                  typePartId: d.Int32.typePartId,
                }),
              }}
              typeParameterCount={item.typeParameterCount}
              typePartId={item.typePartId}
              isSelected={props.selectedTypePartId === item.typePartId}
            />
          ))}
        </div>
      );
    }
  }
});
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
const DataTypeItem: React.VFC<
  Pick<UseDefinyAppResult, "jump" | "language"> & {
    typePartId: d.TypePartId;
    name: ReadonlyArray<SuggestionText>;
    typeParameterCount: number;
    dataType: d.DataType;
    onChange: (newDataType: d.DataType) => void;
    isSelected: boolean;
  }
> = React.memo(
  ({
    onChange,
    typePartId,
    typeParameterCount,
    name,
    jump,
    language,
    isSelected,
  }) => {
    const onClick = React.useCallback(() => {
      onChange({
        typePartId,
        arguments: new Array<d.DataType>(typeParameterCount).fill({
          arguments: [],
          typePartId: d.Int32.typePartId,
        }),
      });
    }, [onChange, typeParameterCount, typePartId]);

    return (
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "1fr auto",
          border: isSelected ? "solid 2px red" : "solid 2px transparent",
        })}
      >
        <Button onClick={onClick}>
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
          onJump={jump}
          urlData={{
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

const DataTypeParameterList: React.VFC<
  Pick<UseDefinyAppResult, "jump" | "language" | "typePartResource"> & {
    typePartId: d.TypePartId;
    onChange: (t: d.DataType) => void;
    selectedTypePartId: d.TypePartId;
  }
> = React.memo((props) => {
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
          {data.dataTypeParameterList.map((p) => (
            <DataTypeItem
              key={p.typePartId}
              jump={props.jump}
              language={props.language}
              name={[{ text: p.name, isEmphasis: false }]}
              onChange={props.onChange}
              dataType={{ typePartId: p.typePartId, arguments: [] }}
              typeParameterCount={0}
              typePartId={p.typePartId}
              isSelected={props.typePartId === props.selectedTypePartId}
            />
          ))}
        </div>
      );
    }
  }
});
DataTypeParameterList.displayName = "DataTypeParameterList";

export const dataTypeOperation: ElementOperation<
  DataTypeSelection,
  DataTypeValue
> = {
  moveDown: neverFunc,
  moveUp: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: DataTypeSelectionView,
  detailView: DataTypeDetailView,
};
