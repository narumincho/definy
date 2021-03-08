import * as d from "./data";

/* eslint-disable @typescript-eslint/no-namespace */
namespace core {
  export type Time = { second: number; millisecond: number };
  export const Time: Product<Time> = {
    from: (time: Time): Time => time,
    typePart: d.TypePart.helper({
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
