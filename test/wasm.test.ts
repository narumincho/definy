import { optToWasmBinary } from "../gen/wasm/main";

test("wasm test", (done) => {
  WebAssembly.instantiate(
    optToWasmBinary({
      functionList: [
        {
          export: { tag: "export", name: "ok28" },
          expr: {
            tag: "I32Add",
            left: { tag: "I32Const", value: 20 },
            right: { tag: "I32Const", value: 8 },
          },
        },
        {
          export: { tag: "export", name: "oneAddOne" },
          expr: {
            tag: "I32Add",
            left: { tag: "I32Const", value: 1 },
            right: { tag: "I32Const", value: 1 },
          },
        },
        {
          export: { tag: "export", name: "よん" },
          expr: {
            tag: "I32Sub",
            left: { tag: "I32Const", value: 5 },
            right: { tag: "I32Const", value: 1 },
          },
        },
        {
          export: { tag: "export", name: "マイナス" },
          expr: {
            tag: "I32Sub",
            left: { tag: "I32Const", value: 1000 },
            right: { tag: "I32Const", value: 100000 },
          },
        },
      ],
    }),
    {}
  ).then((result) => {
    const resultMap = new Map<string, number>();
    for (const [name, func] of Object.entries(result.instance.exports)) {
      resultMap.set(name, (func as () => number)());
    }
    expect(resultMap).toMatchSnapshot();
    done();
  });
});
