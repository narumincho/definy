import * as React from "react";
import * as d from "../../data";
import { UseDefinyAppResult } from "../hook/useDefinyApp";

export type Props = Pick<UseDefinyAppResult, "typePartResource"> & {
  typePartId: d.TypePartId;
};

export const TypePartPage: React.VFC<Props> = (props) => {
  React.useEffect(() => {
    props.typePartResource.forciblyRequestToServer(props.typePartId);
  }, []);

  const typePartResource = props.typePartResource.getFromMemoryCache(
    props.typePartId
  );
  if (typePartResource === undefined) {
    return <div>取得準備中</div>;
  }
  if (typePartResource._ === "Deleted") {
    return (
      <div>
        <div>不明な型パーツ</div>
        <div>型パーツID: {props.typePartId}</div>
      </div>
    );
  }
  if (typePartResource._ === "Unknown") {
    return <div>取得に失敗しました</div>;
  }
  if (typePartResource._ === "Requesting") {
    return <div>取得中</div>;
  }
  return (
    <div>
      <div>name: {typePartResource.dataWithTime.data.name}</div>
      {JSON.stringify(typePartResource.dataWithTime)}
    </div>
  );
};
