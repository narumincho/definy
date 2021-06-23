import * as React from "react";
import * as d from "../../data";
import { listUpdateAt, neverFunc } from "../../common/util";
import { Button } from "../ui/Button";
import { ElementOperation } from "./ElementOperation";
import { Link } from "../ui/Link";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";
import { useOneLineTextEditor } from "../ui/OneLineTextEditor";

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
>["selectionView"] = React.memo((props) => {
  React.useEffect(() => {
    props.value.typePartResource.requestToServerIfEmpty(
      props.value.type.typePartId
    );
  }, [props.value.type.typePartId, props.value.typePartResource]);

  const result = getTypePartNameFromTypePartId(
    props.value.type.typePartId,
    props.value.typePartResource,
    props.value.scopeTypePartId
  );

  if (
    result.typeParameterNameList.length !== props.value.type.parameter.length
  ) {
    return (
      <div>
        パラメータの個数が違う type:{props.value.type}, result:{result}
      </div>
    );
  }

  if (props.value.type.parameter.length === 0) {
    return <div>{result.name}</div>;
  }

  return (
    <div>
      <div>{result.name}</div>
      {props.value.type.parameter.map((t, index) => (
        <TypeArgument
          key={index}
          index={index}
          name={result.typeParameterNameList[index] ?? "???"}
          selection={getTypeArgumentSelection(props.selection, index)}
          value={{ ...props.value, type: t }}
          onChangeSelection={props.onChangeSelection}
        />
      ))}
    </div>
  );
});
TypeSelectionView.displayName = "TypeSelectionView";

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
    scopeTypePart.dataWithTime.data.typeParameterList.find(
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
      typeParameterNameList: resource.dataWithTime.data.typeParameterList.map(
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

type TypeArgumentSelection = TypeSelection | "none" | "self";

const getTypeArgumentSelection = (
  typeSelection: TypeSelection | undefined,
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
  React.memo((props) => {
    const { text, element } = useOneLineTextEditor({
      id: "search",
      initText: "",
    });
    React.useEffect(() => {
      props.value.typePartResource.requestToServerIfEmpty(
        props.value.type.typePartId
      );
    }, [props.value.type.typePartId, props.value.typePartResource]);

    React.useEffect(() => {
      props.value.typePartIdListInProjectResource.requestToServerIfEmpty(
        props.value.projectId
      );
    }, [props.value.typePartIdListInProjectResource, props.value.projectId]);

    const onChange = (type: d.Type): void => {
      props.value.onChange(
        setTypePartAtSelection(props.value.type, props.selection, type)
      );
    };

    return (
      <div>
        <SelectedType
          language={props.value.language}
          jump={props.value.jump}
          typePartId={props.value.type.typePartId}
          typePartResource={props.value.typePartResource}
          scopeTypePartId={props.value.scopeTypePartId}
        />
        <div>{element()}</div>
        <SearchResult
          jump={props.value.jump}
          normalizedSearchText={text.trim().toLocaleLowerCase()}
          typePartIdListInProject={props.value.typePartIdListInProjectResource.getFromMemoryCache(
            props.value.projectId
          )}
          typePartResource={props.value.typePartResource}
          language={props.value.language}
          selectedTypePartId={props.value.type.typePartId}
          onChange={onChange}
        />
        <TypeParameterList
          language={props.value.language}
          jump={props.value.jump}
          typePartId={props.value.scopeTypePartId}
          typePartResource={props.value.typePartResource}
          selectedTypePartId={props.value.type.typePartId}
          onChange={onChange}
        />
      </div>
    );
  });
TypeDetailView.displayName = "TypeDetailView";

const setTypePartAtSelection = (
  currentType: d.Type,
  selection: TypeSelection | undefined,
  type: d.Type
): d.Type => {
  if (selection === undefined) {
    return type;
  }
  return {
    typePartId: currentType.typePartId,
    parameter: listUpdateAt(currentType.parameter, selection.index, (t) =>
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
      <div>{result.name}</div>
      {result.type === "inTypeParameter" ? (
        <></>
      ) : (
        <Link
          onJump={props.jump}
          urlData={{
            language: props.language,
            location: d.Location.TypePart(props.typePartId),
          }}
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
    onChange: (t: d.Type) => void;
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
            <TypeItem
              key={item.typePartId}
              jump={props.jump}
              language={props.language}
              name={item.name}
              onChange={props.onChange}
              type={{
                typePartId: item.typePartId,
                parameter: new Array<d.Type>(item.typeParameterCount).fill({
                  parameter: [],
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
          ],
          typeParameterCount: data.typeParameterList.length,
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
const TypeItem: React.VFC<
  Pick<UseDefinyAppResult, "jump" | "language"> & {
    typePartId: d.TypePartId;
    name: ReadonlyArray<SuggestionText>;
    typeParameterCount: number;
    type: d.Type;
    onChange: (type: d.Type) => void;
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
        parameter: new Array<d.Type>(typeParameterCount).fill({
          parameter: [],
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
TypeItem.displayName = "TypeItem";

const TypeParameterList: React.VFC<
  Pick<UseDefinyAppResult, "jump" | "language" | "typePartResource"> & {
    typePartId: d.TypePartId;
    onChange: (t: d.Type) => void;
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
      if (data.typeParameterList.length === 0) {
        return <div>型パラメータはない</div>;
      }
      return (
        <div>
          <div>型パラメータから</div>
          {data.typeParameterList.map((p) => (
            <TypeItem
              key={p.typePartId}
              jump={props.jump}
              language={props.language}
              name={[{ text: p.name, isEmphasis: false }]}
              onChange={props.onChange}
              type={{ typePartId: p.typePartId, parameter: [] }}
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
TypeParameterList.displayName = "TypeParameterList";

export const typeOperation: ElementOperation<TypeSelection, TypeValue> = {
  moveDown: neverFunc,
  moveUp: neverFunc,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TypeSelectionView,
  detailView: TypeDetailView,
};
