import * as ui from "./ui";
import { data } from "definy-common";

const sidePanelWidth = 260;

export const sidePanel = (
  urlData: data.UrlData,
  onJump: (urlData: data.UrlData) => void
): ui.Panel =>
  ui.column(
    {
      width: { _: "Fix", size: sidePanelWidth },
      height: { _: "Stretch" },
      alignContent: "start",
      backgroundColor: "Dark",
      key: "sidePanel",
    },
    [
      ui.link(
        {
          urlData: { ...urlData, location: data.Location.Home },
          key: "logo",
          onJump,
          width: { _: "Stretch" },
          height: { _: "Auto" },
          padding: 8,
        },
        ui.text(
          {
            key: "logo",
            fontSize: 32,
            color: { _: "Custom", code: "#b9d09b" },
            width: { _: "Stretch" },
            height: { _: "Auto" },
            justifySelf: "center",
          },
          "Definy"
        )
      ),
      ui.text(
        {
          key: "user",
          justifySelf: "start",
          fontSize: 24,
          width: { _: "Stretch" },
          height: { _: "Auto" },
          padding: 8,
        },
        "User"
      ),
      ui.text(
        {
          key: "project",
          justifySelf: "start",
          fontSize: 24,
          width: { _: "Stretch" },
          height: { _: "Auto" },
          padding: 8,
        },
        "Project"
      ),
      ui.link(
        {
          urlData: {
            ...urlData,
            location: data.Location.Idea(
              "be9a40a32e2ddb7c8b09aa458fe206a1" as data.IdeaId
            ),
          },
          key: "link",
          onJump,
          justifySelf: "start",
          width: { _: "Stretch" },
          height: { _: "Auto" },
          padding: 8,
        },
        ui.text(
          {
            key: "idea",
            justifySelf: "start",
            fontSize: 24,
            width: { _: "Stretch" },
            height: { _: "Auto" },
          },
          "Idea"
        )
      ),
      ui.text(
        {
          key: "suggestion",
          justifySelf: "start",
          fontSize: 24,
          width: { _: "Stretch" },
          height: { _: "Auto" },
          padding: 8,
        },
        "Suggestion"
      ),
      ui.text(
        {
          key: "module",
          justifySelf: "start",
          fontSize: 24,
          width: { _: "Stretch" },
          height: { _: "Auto" },
          padding: 8,
        },
        "module"
      ),
      ui.link(
        {
          urlData: {
            ...urlData,
            location: data.Location.About,
          },
          key: "about",
          onJump,
          justifySelf: "start",
          width: { _: "Stretch" },
          height: { _: "Auto" },
          padding: 8,
        },
        ui.text(
          {
            key: "about",
            justifySelf: "start",
            fontSize: 24,
            width: { _: "Stretch" },
            height: { _: "Auto" },
          },
          "about"
        )
      ),
    ]
  );
