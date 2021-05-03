import * as React from "react";
import * as d from "../../data";
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

  const typePartResource = props.value.typePartResource.getFromMemoryCache(
    props.value.type.typePartId
  );

  if (typePartResource === undefined) {
    return <div>型パーツの取得準備待ち</div>;
  }
  switch (typePartResource._) {
    case "Deleted":
      return <div>削除された型パーツ</div>;
    case "Requesting":
      return <div>取得中</div>;
    case "Unknown":
      return <div>取得に失敗</div>;
    case "Loaded":
      return (
        <div>
          <div>{typePartResource.dataWithTime.data.name}</div>
          {props.value.type.parameter.map((t, index) => (
            <TypeArgument
              key={index}
              index={index}
              selection={getTypeArgumentSelection(props.selection, index)}
              value={{ ...props.value, type: t }}
              onChangeSelection={props.onChangeSelection}
            />
          ))}
        </div>
      );
  }
});
TypeSelectionView.displayName = "TypeSelectionView";

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
  value: TypeValue;
  onChangeSelection: (typeSelection: TypeSelection) => void;
}> = React.memo(({ index, selection, value, onChangeSelection }) => {
  const onChangeArgumentSelection = React.useCallback(
    (typeSelection: TypeSelection) => {
      onChangeSelection({ index, typeSelection });
    },
    [index, onChangeSelection]
  );
  return (
    <div
      className={css({
        borderStyle: "solid",
        borderColor: selection === "self" ? "red" : "#000",
        borderWidth: 1,
      })}
    >
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

const TypeDetailView: ElementOperation<
  TypeSelection,
  TypeValue
>["detailView"] = React.memo((props) => {
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

  return (
    <div>
      <SelectedType
        language={props.value.language}
        jump={props.value.jump}
        typePartId={props.value.type.typePartId}
        typePartResource={props.value.typePartResource}
      />
      <div>
        <div>検索</div>
        {element()}
      </div>
      <SearchResult
        jump={props.value.jump}
        normalizedSearchText={text.trim().toLocaleLowerCase()}
        typePartIdListInProject={props.value.typePartIdListInProjectResource.getFromMemoryCache(
          props.value.projectId
        )}
        typePartResource={props.value.typePartResource}
        language={props.value.language}
        onChange={props.value.onChange}
      />
      <TypeParameterList
        language={props.value.language}
        jump={props.value.jump}
        typePartId={props.value.type.typePartId}
        typePartResource={props.value.typePartResource}
        onChange={props.value.onChange}
      />
    </div>
  );
});
TypeDetailView.displayName = "TypeDetailView";

const SelectedType: React.VFC<
  Pick<UseDefinyAppResult, "typePartResource" | "jump" | "language"> & {
    typePartId: d.TypePartId;
  }
> = React.memo((props) => {
  const typePartResource = props.typePartResource.getFromMemoryCache(
    props.typePartId
  );
  if (typePartResource === undefined) {
    return <div>型パーツの取得準備待ち</div>;
  }
  switch (typePartResource._) {
    case "Deleted":
      return <div>削除された型パーツ</div>;
    case "Requesting":
      return <div>取得中</div>;
    case "Unknown":
      return <div>取得に失敗</div>;
    case "Loaded":
      return (
        <div>
          <div>{typePartResource.dataWithTime.data.name}</div>
          <Link
            onJump={props.jump}
            urlData={{
              language: props.language,
              location: d.Location.TypePart(props.typePartId),
            }}
          >
            {typePartResource.dataWithTime.data.name}のページ
          </Link>
        </div>
      );
  }
});
SelectedType.displayName = "SelectedType";

const SearchResult: React.VFC<
  Pick<UseDefinyAppResult, "language" | "typePartResource" | "jump"> & {
    typePartIdListInProject:
      | d.ResourceState<ReadonlyArray<d.TypePartId>>
      | undefined;
    /** 前後の空白を取り除き, 小文字に変換しておく必要がある */
    normalizedSearchText: string;
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
      const typePartList = props.typePartIdListInProject.dataWithTime.data.flatMap<{
        typePartId: d.TypePartId;
        name: string;
        typeParameterCount: number;
        point: number;
      }>((typePartId) => {
        const typePart = props.typePartResource.getFromMemoryCache(typePartId);
        if (typePart === undefined || typePart._ !== "Loaded") {
          return [];
        }
        const data = typePart.dataWithTime.data;
        if (
          data.name.toLocaleLowerCase().includes(props.normalizedSearchText)
        ) {
          return [
            {
              typePartId,
              name: data.name,
              typeParameterCount: data.typeParameterList.length,
              point: data.name.length - props.normalizedSearchText.length,
            },
          ];
        }
        return [];
      });
      typePartList.sort((itemA, itemB) => itemA.point - itemB.point);
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
            />
          ))}
        </div>
      );
    }
  }
});
SearchResult.displayName = "SearchResult";

/**
 * 型を選択するボタン, ボタンの右に詳細ページへ移動するリンクがある
 */
const TypeItem: React.VFC<
  Pick<UseDefinyAppResult, "jump" | "language"> & {
    typePartId: d.TypePartId;
    name: string;
    typeParameterCount: number;
    type: d.Type;
    onChange: (type: d.Type) => void;
  }
> = React.memo(
  ({ onChange, typePartId, typeParameterCount, name, jump, language }) => {
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
        })}
      >
        <Button onClick={onClick}>{name}</Button>
        <Link
          onJump={jump}
          urlData={{
            language,
            location: d.Location.TypePart(typePartId),
          }}
        >
          →
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
      return (
        <div>
          {data.typeParameterList.map((p) => (
            <TypeItem
              key={p.typePartId}
              jump={props.jump}
              language={props.language}
              name={p.name}
              onChange={props.onChange}
              type={{ typePartId: p.typePartId, parameter: [] }}
              typeParameterCount={0}
              typePartId={p.typePartId}
            />
          ))}
        </div>
      );
    }
  }
});
TypeParameterList.displayName = "TypeParameterList";

export const typeOperation: ElementOperation<TypeSelection, TypeValue> = {
  moveDown: () => undefined,
  moveUp: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TypeSelectionView,
  detailView: TypeDetailView,
};