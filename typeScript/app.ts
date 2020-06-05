import * as React from "react";
import * as ui from "./ui";
import { Maybe, UrlData, Location, IdeaId } from "definy-common/source/data";
import * as common from "definy-common";

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

const sidePanelWidth = 260;

export const App: React.FC<{ urlData: UrlData }> = (prop) => {
  const { width, height } = useWindowDimensions();
  const [nowUrlData, onJump] = React.useState<UrlData>(prop.urlData);

  React.useEffect(() => {
    history.pushState(
      undefined,
      "それな!?",
      common.urlDataAndAccessTokenToUrl(nowUrlData, Maybe.Nothing()).toString()
    );
  }, [nowUrlData]);

  return ui.row(
    {
      width: width,
      height: height,
      key: "root",
    },
    [
      [sidePanelWidth.toString() + "px", sidePanel(height, nowUrlData, onJump)],
      [
        "1fr",
        ui.text(
          { key: "nowLocation", color: "#ddd" },
          JSON.stringify(nowUrlData)
        ),
      ],
    ]
  );
};

const sidePanel = (
  height: number,
  urlData: UrlData,
  onJump: (urlData: UrlData) => void
) =>
  ui.column(
    {
      width: sidePanelWidth,
      height: height,
      alignContent: "start",
      backgroundColor: "Dark",
      key: "sidePanel",
    },
    [
      [
        "auto",
        ui.link(
          {
            urlData: { ...urlData, location: Location.Home },
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
      ],
      [
        "auto",
        ui.text(
          {
            key: "user",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "User"
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "project",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "Project"
        ),
      ],
      [
        "auto",
        ui.link(
          {
            urlData: {
              ...urlData,
              location: Location.Idea(
                "be9a40a32e2ddb7c8b09aa458fe206a1" as IdeaId
              ),
            },
            key: "link",
            onJump,
            justifySelf: "start",
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
      ],
      [
        "auto",
        ui.text(
          {
            key: "suggestion",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "Suggestion"
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "module",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "module"
        ),
      ],
      [
        "auto",
        ui.text(
          {
            key: "about",
            justifySelf: "start",
            fontSize: 24,
            color: "#ddd",
          },
          "about"
        ),
      ],
    ]
  );
