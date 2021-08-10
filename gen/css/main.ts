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

export const width = (value: string | number): Declaration => {
  return {
    property: "width",
    value: typeof value === "number" ? `${value}px` : value,
  };
};
export const height = (value: string | number): Declaration => {
  return {
    property: "height",
    value: typeof value === "number" ? `${value}px` : value,
  };
};

export const boxSizingBorderBox: Declaration = {
  property: "box-sizing",
  value: "border-box",
};

export const displayGrid: Declaration = {
  property: "display",
  value: "grid",
};
export const margin0: Declaration = {
  property: "margin",
  value: "0",
};
