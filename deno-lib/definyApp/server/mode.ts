export type Mode =
  | { readonly type: "dev"; readonly port: number }
  | { readonly type: "denoDeploy" };
