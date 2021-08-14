import { createHash } from "sha256-uint8array";

export type Declaration = {
  readonly property: string;
  readonly value: string;
};

export type Rule = {
  readonly selector: string;
  readonly declarationList: ReadonlyArray<Declaration>;
};

export const declarationToString = (declaration: Declaration): string => {
  return declaration.property + ":" + declaration.value + ";";
};

/**
 * style 属性に直接指定するときに使う
 */
export const declarationListToString = (
  declarationList: ReadonlyArray<Declaration>
): string => {
  return declarationList.map(declarationToString).join("");
};

export const ruleToString = (rule: Rule): string => {
  return (
    rule.selector + "{" + declarationListToString(rule.declarationList) + "}"
  );
};

export const ruleListToString = (ruleList: ReadonlyArray<Rule>): string => {
  return ruleList.map(ruleToString).join("");
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

export const declarationListToSha256HashValue = (
  declarationList: ReadonlyArray<Declaration>
): string => {
  return createHash("sha256")
    .update(declarationListToString(declarationList))
    .digest("hex");
};
