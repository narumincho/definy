import * as React from "react";
import * as d from "../../data";
import { ElementOperation } from "./ElementOperation";
import { Link } from "../ui/Link";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";
import { css } from "@emotion/css";
import { listSetAt } from "../../common/util";
import { useOneLineTextEditor } from "../ui/OneLineTextEditor";

export type TypeSelection = {
  readonly index: number;
  readonly typeSelection: TypeSelection | undefined;
};

export type TypeValue = Pick<
  UseDefinyAppResult,
  "typePartResource" | "jump" | "language"
> & {
  readonly type: d.Type;
  readonly canEdit: boolean;
};

export type TypeDataOperation = {
  readonly newType: d.Type;
};

const TypeSelectionView: ElementOperation<
  TypeSelection,
  TypeValue,
  TypeDataOperation
>["selectionView"] = (props) => {
  React.useEffect(() => {
    props.value.typePartResource.requestToServerIfEmpty(
      props.value.type.typePartId
    );
  }, [props.value.type.typePartId]);
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
            <div
              className={css({
                borderStyle: "solid",
                borderColor:
                  props.selection !== undefined &&
                  props.selection.index === index &&
                  props.selection.typeSelection === undefined
                    ? "red"
                    : "#000",
                borderWidth: 1,
              })}
            >
              <TypeSelectionView
                value={{ ...props.value, type: t }}
                selection={
                  props.selection !== undefined &&
                  props.selection.index === index
                    ? props.selection.typeSelection
                    : undefined
                }
                onRequestDataOperation={(typeOp) => {
                  props.onRequestDataOperation({
                    newType: {
                      typePartId: props.value.type.typePartId,
                      parameter: listSetAt(
                        props.value.type.parameter,
                        index,
                        typeOp.newType
                      ),
                    },
                  });
                }}
                onChangeSelection={(typeSelection) => {
                  props.onChangeSelection({ index, typeSelection });
                }}
              />
            </div>
          ))}
        </div>
      );
  }
};

const TypeDetailView: ElementOperation<
  TypeSelection,
  TypeValue,
  TypeDataOperation
>["detailView"] = (props) => {
  const { text, element } = useOneLineTextEditor({
    id: "search",
    initText: "",
  });
  React.useEffect(() => {
    props.value.typePartResource.requestToServerIfEmpty(
      props.value.type.typePartId
    );
  }, [props.value.type.typePartId]);
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
      <div>{text} で検索して絞り込んだ型パーツの一覧を表示する</div>
    </div>
  );
};

const SelectedType: React.VFC<
  Pick<UseDefinyAppResult, "typePartResource" | "jump" | "language"> & {
    typePartId: d.TypePartId;
  }
> = (props) => {
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
};

export const typeOperation: ElementOperation<
  TypeSelection,
  TypeValue,
  TypeDataOperation
> = {
  moveDown: () => undefined,
  moveUp: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TypeSelectionView,
  detailView: TypeDetailView,
};
