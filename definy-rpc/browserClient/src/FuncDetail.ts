export type FuncDetail = {
  readonly name: ReadonlyArray<string>;
  readonly description: string;
  readonly input: {
    readonly fullName: ReadonlyArray<string>;
  };
  readonly output: {
    readonly fullName: ReadonlyArray<string>;
  };
};
