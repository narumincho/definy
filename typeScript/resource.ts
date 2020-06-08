type Resource<T> =
  | { _: "Loading" }
  | { _: "Loaded"; snapshot: T }
  | { _: "NotFound" };
