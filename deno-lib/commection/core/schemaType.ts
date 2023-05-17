export type SchemaType<ImplementType> = {
  readonly name: string;
  readonly typeDefinitions: ReadonlyArray<TypeDefinition>;
  readonly functionDefinitions: ReadonlyArray<FunctionDefinition>;
  readonly __implementType: ImplementType;
};

export type TypeDefinition = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly attribute: TypeAttribute | undefined;
  readonly body: TypeStructure;
};

export type TypeAttribute = "";

export type TypeStructure = {
  readonly type: "sum";
  readonly pattern: ReadonlyArray<Pattern>;
} | {
  readonly type: "product";
  readonly fields: ReadonlyArray<Field>;
};

export type Pattern = {
  readonly name: string;
  readonly description: string;
};

export type Field = {
  readonly name: string;
  readonly description: string;
  readonly type: Type;
};

export type FunctionDefinition = {
  readonly name: string;
  readonly parameters: ReadonlyArray<FunctionParameter>;
  readonly resultType: Type;
  readonly typeParameter: ReadonlyArray<string>;
};

export type FunctionParameter = {
  readonly name: string;
  readonly type: Type;
};

export type Type = {
  readonly id: string;
  readonly arguments: ReadonlyArray<Type>;
};
