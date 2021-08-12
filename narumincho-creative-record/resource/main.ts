import * as list from "./list";
import { origin } from "../origin";

type ListType = typeof list;

const resourcePath = "./narumincho-creative-record/resource";

export const resourceUrl = Object.fromEntries(
  Object.entries(list).map(([path]) => [path, new URL(origin + "/" + path)])
) as { [key in keyof ListType]: URL };

export const pathAndFilePathList: ReadonlyArray<{
  path: string;
  filePath: string;
}> = Object.entries(list).map(([path, filePath]) => ({
  path: "/" + path,
  filePath: resourcePath + "/" + filePath,
}));
