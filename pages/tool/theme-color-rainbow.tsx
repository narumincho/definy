import * as React from "react";
import Head from "next/head";
import { Language } from "../../common/zodType";
import { css } from "@emotion/css";
import { useLanguage } from "../../client/hook/useLanguage";

const themeColorName = "theme-color";

export const changeThemeColor = (newThemeColor: string | null): void => {
  const themeColorMetaElement = window.document
    .getElementsByTagName("meta")
    .namedItem("theme-color");
  if (themeColorMetaElement !== null) {
    if (typeof newThemeColor === "string") {
      themeColorMetaElement.content = newThemeColor;
      return;
    }
    themeColorMetaElement.remove();
    return;
  }
  if (newThemeColor === null) {
    return;
  }
  const newMetaElement = document.createElement("meta");
  document.head.appendChild(newMetaElement);
  newMetaElement.name = themeColorName;
  newMetaElement.content = newThemeColor;
};

const numberToString = (num: number): string =>
  Math.abs((Math.floor(num) % 0xff) - 0x80)
    .toString(16)
    .padStart(2, "0");

const countToColor = (count: number): string => {
  return (
    "#" +
    numberToString(count / 5) +
    numberToString(count / 3) +
    numberToString(count / 2)
  );
};

const svgWith = 230;
const svgHeight = 24;

export const ThemeColorRainbow = (): React.ReactElement => {
  const language = useLanguage();
  const [count, setCount] = React.useState<number>(0);
  React.useEffect(() => {
    const loop = () => {
      setCount((oldCount) => {
        changeThemeColor(countToColor(oldCount));
        return (oldCount + 3) % 0xffffff;
      });

      requestAnimationFrame(loop);
    };

    loop();
  }, []);

  const message = languageToMessage(language);
  return (
    <>
      <Head>
        <title>{message}</title>
      </Head>
      <svg
        viewBox={`0 0 ${svgWith} ${svgHeight}`}
        className={css({
          width: "100%",
          height: "100%",
          paintOrder: "stroke fill",
          display: "block",
        })}
        style={{
          backgroundColor: countToColor(count),
        }}
      >
        <text
          x={svgWith / 2}
          y={svgHeight / 2}
          fill="white"
          stroke="black"
          fontSize="20"
          strokeWidth="3"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {message}
        </text>
      </svg>
    </>
  );
};

const languageToMessage = (language: Language): string => {
  switch (language) {
    case "japanese":
      return "テーマカラーレインボー!";
    case "english":
      return "Theme Color Rainbow";
    case "esperanto":
      return "temo koloro ĉielarko";
  }
};

export default ThemeColorRainbow;
