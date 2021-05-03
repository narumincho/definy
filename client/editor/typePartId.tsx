import * as React from "react";
import * as d from "../../data";
import type { ElementOperation } from "./ElementOperation";
import { Link } from "../ui/Link";
import type { UseDefinyAppResult } from "../hook/useDefinyApp";

export type TypePartIdSelection = never;
export type TypePartIdValue = {
  readonly typePartId: d.TypePartId;
  readonly canEdit: boolean;
} & Pick<UseDefinyAppResult, "typePartResource" | "language" | "jump">;

const TypePartIdSelectionView: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue
>["selectionView"] = React.memo((props) => {
  React.useEffect(() => {
    props.value.typePartResource.requestToServerIfEmpty(props.value.typePartId);
  }, [props.value.typePartId, props.value.typePartResource]);

  const typePartResource = props.value.typePartResource.getFromMemoryCache(
    props.value.typePartId
  );
  if (typePartResource === undefined) {
    return (
      <Link
        onJump={props.value.jump}
        urlData={{
          language: props.value.language,
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
        onJump={props.value.jump}
        urlData={{
          language: props.value.language,
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
        onJump={props.value.jump}
        urlData={{
          language: props.value.language,
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
        onJump={props.value.jump}
        urlData={{
          language: props.value.language,
          location: d.Location.TypePart(props.value.typePartId),
        }}
      >
        取得中
      </Link>
    );
  }
  return (
    <Link
      onJump={props.value.jump}
      urlData={{
        language: props.value.language,
        location: d.Location.TypePart(props.value.typePartId),
      }}
    >
      {typePartResource.dataWithTime.data.name}
    </Link>
  );
});
TypePartIdSelectionView.displayName = "TypePartIdSelectionView";

const TypePartIdDetailView: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue
>["detailView"] = React.memo(() => {
  return <div>検索欄と, 候補の選択肢</div>;
});
TypePartIdDetailView.displayName = "TypePartIdDetailView";

export const typePartIdOperation: ElementOperation<
  TypePartIdSelection,
  TypePartIdValue
> = {
  moveUp: () => undefined,
  moveDown: () => undefined,
  moveFirstChild: () => undefined,
  moveParent: () => undefined,
  selectionView: TypePartIdSelectionView,
  detailView: TypePartIdDetailView,
};
