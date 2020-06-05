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

export const App: React.FC<{ location: ui.Location }> = (prop) => {
  const { width, height } = useWindowDimensions();
  const [nowLocation, onJump] = React.useState<ui.Location>(prop.location);

  React.useEffect(() => {
    history.pushState({}, "それな!?", ui.locationToUrl(nowLocation));
  }, [nowLocation]);

  return ui.row(
    {
      width: width,
      height: height,
      key: "root",
    },
    [
      sidePanel(height, onJump),
      ui.text({ key: "nowLocation", color: "#ddd" }, nowLocation),
    ]
  );
};

const sidePanel = (height: number, onJump: (location: ui.Location) => void) =>
  ui.column(
    {
      width: 260,
      height: height,
      alignContent: "start",
      backgroundColor: "Dark",
      key: "sidePanel",
    },
    [
      ui.link(
        {
          location: "Home",
          key: "logo",
          onJump,
        },
        ui.text(
          {
            key: "logo",
            fontSize: 32,
            color: "#b9d09b",
          },
          "Definy"
        )
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
      ui.link(
        {
          location: "Idea",
          key: "link",
          onJump,
        },
        ui.text(
          {
            key: "idea",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "Idea"
        )
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
