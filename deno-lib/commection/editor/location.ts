import { SimpleUrl } from "../../simpleRequestResponse/simpleUrl.ts";

export type PageLocation = {
  type: "top";
};

export const simpleUrlToPageLocation = (simpleUrl: SimpleUrl): PageLocation => {
  return {
    type: "top",
  };
};
