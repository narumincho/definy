import type { ComponentProps, JSX } from "react";
import { Link as VoidLink } from "@void/react";
import { withLanguage } from "../language.ts";
import { useDefiny } from "../state.tsx";

/**
 * `@void/react` の Link に, 今の表示言語の `?lang=` を付けたもの.
 * 表示言語は URL だけで決めるので, サイト内のリンクは Void の Link を直接使わずこれを使う
 */
export function Link(props: ComponentProps<typeof VoidLink>): JSX.Element {
  const { language } = useDefiny();
  return <VoidLink {...props} href={withLanguage(props.href, language)} />;
}
