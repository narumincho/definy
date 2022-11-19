import React from "https://esm.sh/react@18.2.0?pin=v99";
import { dollar } from "./nodeRed.ts";

export const TypedInput = (props: {
  readonly id: string;
}): React.ReactElement => {
  React.useEffect(() => {
    dollar(`#${props.id}`).typedInput({
      type: "str",
      types: ["msg", "flow", "global", "str", "num", "bool", "json"],
      typeField: `#${props.id}-type`,
    });
  }, []);

  return <input id={props.id} type="text" />;
};
