import * as d from "definy-core/source/data";
import {
  createNoParameterTagEditor,
  createWithParameterSumEditor,
} from "./sumEditor";
import { Editor } from "./ui";
import { OneLineTextInput } from "./oneLineTextInput";
import { createListEditor } from "./listEditor";
import { createMaybeEditor } from "./maybeEditor";
import { createProductEditor } from "./productEditor";

const TypeEditor: Editor<d.Type> = 32;

const SumEditor: Editor<ReadonlyArray<d.Pattern>> = createListEditor<d.Pattern>(
  createProductEditor<d.Pattern>({
    name: OneLineTextInput,
    description: OneLineTextInput,
    parameter: createMaybeEditor<d.Type>(TypeEditor, {
      typePartId: "af9d19ab30a1c934f9d0cf09cad04589" as d.TypePartId,
      parameter: [],
    }),
  }),
  {
    name: "InitPatternName",
    description: "initPatternDescription",
    parameter: d.Maybe.Nothing(),
  }
);
const ProductEditor: Editor<
  ReadonlyArray<d.Member>
> = createListEditor<d.Member>(
  createProductEditor<d.Member>({
    name: OneLineTextInput,
    description: OneLineTextInput,
    type: TypeEditor,
  }),
  {
    name: "initMemberName",
    description: "initMemberDescription",
    type: {
      typePartId: "3dbd12ffa8e2af8d099d6f9c810eb343" as d.TypePartId,
      parameter: [],
    },
  }
);
const KernelEditor: Editor<d.TypePartBodyKernel> = createNoParameterTagEditor<d.TypePartBodyKernel>(
  ["Function", "Int32", "String", "Binary", "Id", "Token", "List"]
);

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
