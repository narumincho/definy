import * as React from "react";
import * as zodType from "../common/zodType";
export type TextProps = {
  readonly [language in zodType.Language]: string;
};

export const Text = (
  props: TextProps & { readonly language: zodType.Language }
): JSX.Element => {
  return <div>{props[props.language]}</div>;
};

export const langText = (
  table: TextProps,
  language: zodType.Language
): string => {
  return table[language];
};
