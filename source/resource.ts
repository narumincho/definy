import { data } from "definy-common";

export type Resource<T> =
  | { _: "Loading" }
  | { _: "Loaded"; snapshot: T }
  | { _: "NotFound" };

export type ProjectData = ReadonlyMap<
  data.ProjectId,
  Resource<data.ProjectSnapshot>
>;
