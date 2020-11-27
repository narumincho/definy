import * as d from "definy-core/source/data";
import { Editor } from "./ui";
import { createWithParameterSumEditor } from "./sumEditor";
import { createListEditor } from "./listEditor";
import { createProductEditor } from "./productEditor";
import { OneLineTextInput } from "./oneLineTextInput";

const TypeEditor: Editor<d.Type> = 32;

const SumEditor: Editor<ReadonlyArray<d.Pattern>> = createListEditor<d.Pattern>(
  createProductEditor<d.Pattern>({
    name: OneLineTextInput,
    description: OneLineTextInput,
    parameter: create,
  }),
  {
    name: "InitPatternName",
    description: "initPatternDescription",
    parameter: d.Maybe.Nothing(),
  }
);
const ProductEditor: Editor<ReadonlyArray<d.Member>> = 32;
const KernelEditor: Editor<d.TypePartBodyKernel> = 32;

/**
 * 型の本体のエディタ
 */
export const TypePartBodyEditor: Editor<d.TypePartBody> = createWithParameterSumEditor<
  {
    Sum: ReadonlyArray<d.Pattern>;
    Product: ReadonlyArray<d.Member>;
    Kernel: d.TypePartBodyKernel;
  },
  "Sum" | "Product" | "Kernel",
  d.TypePartBody
>(
  {
    Sum: SumEditor,
    Product: ProductEditor,
    Kernel: KernelEditor,
  },
  {
    Sum: d.TypePartBody.Sum([]),
    Product: d.TypePartBody.Product([]),
    Kernel: d.TypePartBody.Kernel(d.TypePartBodyKernel.String),
  }
);
