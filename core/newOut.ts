import * as d from "../localData";

/**
 * 試しで, 名前空間付きの出力をどうしようかと思った結果.
 * namespace を使わずに, 複数ファイル出力するようにしよう
 */

/* eslint-disable @typescript-eslint/no-namespace */
namespace core {
  export type Time = { second: number; millisecond: number };
  export const Time: Product<Time> = {
    from: (time: Time): Time => time,
    typePart: d.TypePart.helper({
      id: d.TypePartId.fromString(""),
      name: "Time",
      description: "時間",
      attribute: d.Maybe.Nothing(),
      dataTypeParameterList: [],
      projectId: d.ProjectId.fromString(""),
      body: d.TypePartBody.Product([]),
    }),
  };
}

type Product<T> = { from: (t: T) => T; typePart: d.TypePart };
