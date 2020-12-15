import { AppInterface } from "./appInterface";

export interface State {
  appInterface: AppInterface;
  pageModel: PageModel;
}

export interface PageModel {
  tag: typeof pageModelAboutTag;
}

export const pageModelAboutTag = Symbol("PageModel-About");
