import * as d from "definy-core/source/data";
import { Element } from "./view/view";
import { div } from "./view/viewUtil";

export const view = (type: d.Type): Element<d.Type> => {
  return div(
    {},
    "型エディタは作成中. パラメーターの付き方に合わせて変えられると良いな" +
      type.typePartId
  );
};
