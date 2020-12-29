import * as d from "definy-core/source/data";

import { Button } from "./button";
import { Editor } from "./ui";
import { jsx as h } from "@emotion/react";

const TypeParameterTypeIdEditor: Editor<d.TypePartId> = (props) => {
  return h(
    "div",
    {},
    h(
      Button,
      {
        onClick: () => {
          props.onChange(
            [...crypto.getRandomValues(new Uint8Array(16))]
              .map((e) => e.toString(16).padStart(2, "0"))
              .join("") as d.TypePartId
          );
        },
        key: "randomButton",
      },
      "ランダムなIDを生成"
    ),
    h("div", {}, props.value)
  );
};
