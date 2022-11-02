import React from "https://esm.sh/react@18.2.0";
/// <reference path="./nodeRed.d.ts" />

export const TypedInput = (props: {
  readonly id: string;
}): React.ReactElement => {
  React.useEffect(() => {
    $(`#${props.id}`).typedInput({
      type: "str",
      types: ["msg", "flow", "global", "str", "num", "bool", "json"],
      typeField: `#${props.id}-type`,
    });
  }, []);

  return <input id={props.id} type="text" />;
};
