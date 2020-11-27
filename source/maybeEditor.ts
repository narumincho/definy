import * as d from "definy-core/source/data";
import { Editor } from "./ui";
import { UndefinedEditor } from "./undefinedEditor";
import { createWithParameterSumEditor } from "./sumEditor";

export const createMaybeEditor = <value>(
  valueEditor: Editor<value>,
  justInitValue: value
): Editor<d.Maybe<value>> =>
  createWithParameterSumEditor<
    {
      Just: value;
      Nothing: undefined;
    },
    "Just" | "Nothing",
    d.Maybe<value>
  >(
    {
      Just: valueEditor,
      Nothing: UndefinedEditor,
    },
    {
      Just: d.Maybe.Just(justInitValue),
      Nothing: d.Maybe.Nothing(),
    }
  );
