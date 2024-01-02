import { Operator } from "./out/api/dart.ts";

export const operatorToString = (operator: Operator): string => {
  switch (operator.type) {
    case "nullishCoalescing":
      return "??";
    case "notEqual":
      return "!=";
    case "equal":
      return "==";
    case "add":
      return "+";
    case "logicalAnd":
      return "&&";
  }
};
