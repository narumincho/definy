export type Declaration = {
  readonly property: string;
  readonly value: string;
};

export type DeclarationBlock = {
  readonly declarationList: ReadonlyArray<DeclarationBlock>;
};

export const declarationToString = (declaration: Declaration): string => {
  return declaration.property + ":" + declaration.value + ";";
};

export const declarationListToString = (
  declarationList: ReadonlyArray<Declaration>
): string => {
  return declarationList.map(declarationToString).join("");
};

export const declarationBlockToString = (
  declarationList: ReadonlyArray<Declaration>
): string => {
  return "{" + declarationListToString(declarationList) + "}";
};

export const height = (value: string): Declaration => {
  return {
    property: "height",
    value,
  };
};
