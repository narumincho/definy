import * as React from "react";
import { zodType } from "../deno-lib/npm";
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
