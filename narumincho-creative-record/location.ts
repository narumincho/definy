import { origin } from "./viewOut";

export type Location =
  | "top"
  | "powershellRecursion"
  | "svgBasic"
  | "svgStandaloneEmbed"
  | "aboutDesiredRoute"
  | "messageWindow"
  | "desiredRouteFont"
  | "listSelectionBehavior"
  | "uiColor"
  | "desiredRouteEncounter"
  | "star"
  | "desiredRouteMonster"
  | "nPetitcomIme";

export const locationToUrl = (location: Location): URL => {
  return new URL(origin + "/" + locationToPath(location));
};

const locationToPath = (location: Location): string => {
  switch (location) {
    case "top":
      return "";
    case "powershellRecursion":
      return "powershell-recursion";
    case "svgBasic":
      return "svg-basic";
    case "svgStandaloneEmbed":
      return "svg-standalone-embed";
    case "aboutDesiredRoute":
      return "about-desired-route";
    case "messageWindow":
      return "message-window";
    case "desiredRouteFont":
      return "desired-route-font";
    case "listSelectionBehavior":
      return "list-selection-behavior";
    case "uiColor":
      return "ui-color";
    case "desiredRouteEncounter":
      return "desired-route-encounter";
    case "star":
      return "star";
    case "desiredRouteMonster":
      return "desired-route-monster";
    case "nPetitcomIme":
      return "n-petitcom-ime";
  }
};
