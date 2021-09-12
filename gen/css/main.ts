import { createHash } from "sha256-uint8array";

export type Declaration = {
  readonly property: string;
  readonly value: string;
};

export type Selector =
  | {
      readonly type: "class";
      readonly className: string;
    }
  | {
      readonly type: "type";
      readonly elementName: string;
    };

export const classSelector = (className: string): Selector => {
  return {
    type: "class",
    className,
  };
};

export const typeSelector = (elementName: string): Selector => {
  return {
    type: "type",
    elementName,
  };
};

export type Rule = {
  readonly selector: Selector;
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
    selectorToString(rule.selector) +
    "{" +
    declarationListToString(rule.declarationList) +
    "}"
  );
};

const selectorToString = (selector: Selector): string => {
  switch (selector.type) {
    case "type":
      return selector.elementName;
    case "class":
      return "." + selector.className;
  }
};

type StatementList = {
  readonly keyframesList: ReadonlyArray<Keyframes>;
  readonly ruleList: ReadonlyArray<Rule>;
};

type Keyframes = {
  readonly name: string;
  readonly keyframeList: ReadonlyArray<Keyframe>;
};

type Keyframe = {
  readonly percentage: number;
  readonly declarationList: ReadonlyArray<Declaration>;
};

export const ruleListToString = (statementList: StatementList): string => {
  return (
    statementList.ruleList.map(ruleToString).join("") +
    statementList.keyframesList.map(keyFramesToString).join("")
  );
};

const keyFramesToString = (keyframes: Keyframes): string => {
  return (
    "@keyframes" +
    keyframes.name +
    "{" +
    keyframes.keyframeList.map(keyFrameToString).join("") +
    "}"
  );
};

const keyFrameToString = (keyframe: Keyframe): string => {
  return `${keyframe.percentage} {${declarationListToString(
    keyframe.declarationList
  )}}`;
};

export const widthRem = (value: number): Declaration => {
  return {
    property: "width",
    value: remValueToCssValue(value),
  };
};

export const widthPercent = (value: number): Declaration => {
  return {
    property: "width",
    value: `${value}%`,
  };
};

export const heightRem = (value: number): Declaration => {
  return {
    property: "height",
    value: remValueToCssValue(value),
  };
};

export const height100Percent: Declaration = {
  property: "height",
  value: "100%",
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

const remValueToCssValue = (value: number): string => {
  return `${value}rem`;
};

export const alignItems = (
  value: "stretch" | "center" | "start"
): Declaration => ({
  property: "align-items",
  value,
});

export const backgroundColor = (value: string): Declaration => ({
  property: "background-color",
  value,
});
