import * as d from "../data";

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
      id: "" as d.TypePartId,
      name: "Time",
      description: "時間",
      attribute: d.Maybe.Nothing(),
      typeParameterList: [],
      projectId: "" as d.ProjectId,
      body: d.TypePartBody.Product([]),
    }),
  };
}

type Product<T> = { from: (t: T) => T; typePart: d.TypePart };
