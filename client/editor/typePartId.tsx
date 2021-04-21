import * as React from "react";
import * as d from "../../data";
import type { ElementOperation } from "./ElementOperation";
import { Link } from "../ui/Link";

export type TypePartIdSelection = never;
export type TypePartIdValue = {
  readonly typePartId: d.TypePartId;
  readonly canEdit: boolean;
};

export type TypePartIdDataOperation = never;

const TypePartIdSelectionView: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue,
  TypePartIdDataOperation
>["selectionView"] = (props) => {
  React.useEffect(() => {
    props.typePartResource.requestToServerIfEmpty(props.value.typePartId);
  }, []);
  const typePartResource = props.typePartResource.getFromMemoryCache(
    props.value.typePartId
  );
  if (typePartResource === undefined) {
    return (
      <Link
        onJump={props.onJump}
        urlData={{
          language: props.language,
          location: d.Location.TypePart(props.value.typePartId),
        }}
      >
        リクエスト準備中
      </Link>
    );
  }
  if (typePartResource._ === "Deleted") {
    return (
      <Link
        onJump={props.onJump}
        urlData={{
          language: props.language,
          location: d.Location.TypePart(props.value.typePartId),
        }}
      >
        削除された型パーツ
      </Link>
    );
  }
  if (typePartResource._ === "Unknown") {
    return (
      <Link
        onJump={props.onJump}
        urlData={{
          language: props.language,
          location: d.Location.TypePart(props.value.typePartId),
        }}
      >
        取得に失敗
      </Link>
    );
  }
  if (typePartResource._ === "Requesting") {
    return (
      <Link
        onJump={props.onJump}
        urlData={{
          language: props.language,
          location: d.Location.TypePart(props.value.typePartId),
        }}
      >
        取得中
      </Link>
    );
  }
  return (
    <Link
      onJump={props.onJump}
      urlData={{
        language: props.language,
        location: d.Location.TypePart(props.value.typePartId),
      }}
    >
      {typePartResource.dataWithTime.data.name}
    </Link>
  );
};

const TypePartIdDetailView: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue,
  TypePartIdDataOperation
>["detailView"] = () => {
  return <div>検索欄と, 候補の選択肢</div>;
};

export const typePartIdOperation: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue,
  TypePartIdDataOperation
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TypePartIdSelectionView,
  detailView: TypePartIdDetailView,
};
