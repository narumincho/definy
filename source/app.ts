import * as d from "definy-core/source/data";
import { css, jsx } from "@emotion/react";
import { FunctionComponent } from "react";
import { Header } from "./header";
import { LoadingBox } from "./loadingBox";
import { Model } from "./model";
import { PageAbout } from "./pageAbout";
import { PageDebug } from "./pageDebug";
import { PageHome } from "./pageHome";
import { PageProject } from "./pageProject";

export type Props = {
  model: Model;
};

export const App: FunctionComponent<Props> = (props) => {
  switch (props.model.logInState._) {
    case "RequestingLogInUrl":
      return jsx(RequestingLogInUrl, {
        message: logInMessage(
          props.model.logInState.openIdConnectProvider,
          props.model.language
        ),
      });
    case "JumpingToLogInPage":
      return jsx(RequestingLogInUrl, {
        message: jumpMessage(
          new URL(props.model.logInState.string),
          props.model.language
        ),
      });
  }

  return jsx(
    "div",
    {
      css: css({
        height: "100%",
        display: "grid",
        gridTemplateRows: "48px 1fr",
      }),
    },
    [
      jsx(Header, { key: "header", model: props.model }),
      jsx(Main, { key: "main", model: props.model }),
    ]
  );
};

const RequestingLogInUrl: React.FC<{
  message: string;
}> = (prop) =>
  jsx(
    "div",
    {
      css: css({
        height: "100%",
        display: "grid",
        alignItems: "center",
        justifyItems: "center",
      }),
    },
    jsx(LoadingBox, { message: prop.message })
  );

const logInMessage = (
  provider: d.OpenIdConnectProvider,
  language: d.Language
): string => {
  switch (language) {
    case "English":
      return `Preparing to log in to ${provider}`;
    case "Esperanto":
      return `Preparante ensaluti al Google${provider}`;
    case "Japanese":
      return `${provider}へのログインを準備中……`;
  }
};

const jumpMessage = (url: URL, language: d.Language): string => {
  switch (language) {
    case "English":
      return `Navigating to ${url}`;
    case "Esperanto":
      return `navigante al ${url}`;
    case "Japanese":
      return `${url}へ移動中……`;
  }
};

const Main: FunctionComponent<Props> = (props) => {
  switch (props.model.location._) {
    case "Home":
      return jsx(PageHome, { model: props.model });
    case "Project":
      return jsx(PageProject, {
        model: props.model,
        projectId: props.model.location.projectId,
      });
    case "Debug":
      return jsx(PageDebug, {});
    case "About":
      return jsx(PageAbout, {});
  }
  return jsx("div", {}, "他のページは準備中……");
};
