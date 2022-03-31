import * as React from "react";

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
  const [count, setCount] = React.useState<number>(0);
  React.useEffect(() => {
    const loop = () => {
      setCount((oldCount) => {
        changeThemeColor(countToColor(oldCount));
        return (oldCount + 7) % 0xffffff;
      });

      requestAnimationFrame(loop);
    };

    loop();
  }, []);

  return (
    <svg
      viewBox={`0 0 ${svgWith} ${svgHeight}`}
      style={{
        width: "100%",
        height: "100%",
        paintOrder: "stroke fill",
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
        テーマカラーレインボー
      </text>
    </svg>
  );
};
