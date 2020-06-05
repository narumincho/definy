import * as React from "react";
import * as ui from "./ui";

const getWindowDimensions = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});
const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = React.useState(
    getWindowDimensions()
  );

  React.useEffect(() => {
    const handleResize = () => {
      setWindowDimensions(getWindowDimensions());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowDimensions;
};

export const App: React.FC<Record<string | number | symbol, never>> = () => {
  const { width, height } = useWindowDimensions();
  return ui.column(
    {
      width: 260,
      height: height,
      justifyContent: "stretch",
      alignContent: "start",
      backgroundColor: "Dark",
    },
    [
      ui.text(
        {
          key: "logo",
          justifySelf: "center",
          fontSize: 32,
          color: "#b9d09b",
        },
        "Definy"
      ),
      ui.text(
        {
          key: "user",
          justifySelf: "start",
          fontSize: 24,
          color: "#ddd",
        },
        "User"
      ),
      ui.text(
        {
          key: "project",
          justifySelf: "start",
          fontSize: 24,
          color: "#ddd",
        },
        "Project"
      ),
      ui.text(
        {
          key: "idea",
          justifySelf: "start",
          fontSize: 24,
          color: "#ddd",
        },
        "Idea"
      ),
      ui.text(
        {
          key: "suggestion",
          justifySelf: "start",
          fontSize: 24,
          color: "#ddd",
        },
        "Suggestion"
      ),
      ui.text(
        {
          key: "module",
          justifySelf: "start",
          fontSize: 24,
          color: "#ddd",
        },
        "module"
      ),
      ui.text(
        {
          key: "about",
          justifySelf: "start",
          fontSize: 24,
          color: "#ddd",
        },
        "about"
      ),
    ]
  );
};
