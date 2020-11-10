import * as d from "definy-core/source/data";
import { FunctionComponent, createElement as h } from "react";
import { Header } from "./header";
import { LoadingBox } from "./ui";
import { Model } from "./model";
import { PageHome } from "./pageHome";
import { PageProject } from "./pageProject";
import styled from "styled-components";

export type Props = {
  model: Model;
};

export const App: FunctionComponent<Props> = (props) => {
  switch (props.model.logInState._) {
    case "WaitRequestingLogInUrl":
    case "RequestingLogInUrl":
      return h(RequestingLogInUrl, {
        message: logInMessage(
          props.model.logInState.openIdConnectProvider,
          props.model.language
        ),
      });
    case "JumpingToLogInPage":
      return h(RequestingLogInUrl, {
        message: jumpMessage(
          new URL(props.model.logInState.string),
          props.model.language
        ),
      });
  }

  return h(StyledApp, {}, [
    h(Header, { key: "header", model: props.model }),
    h(Main, { key: "main", model: props.model }),
  ]);
};

const RequestingLogInUrl: React.FC<{
  message: string;
}> = (prop) => h(LogInViewStyledDiv, h(LoadingBox, {}, prop.message));

const LogInViewStyledDiv = styled.div({
  height: "100%",
  display: "grid",
  alignItems: "center",
  justifyItems: "center",
});

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
      return h(PageHome, { model: props.model });
    case "Project":
      return h(PageProject, {
        model: props.model,
        projectId: props.model.location.projectId,
      });
    case "Debug":
      return h("div", {}, "デバッグ画面");
  }
  return h("div", {}, "他のページは準備中……");
};

const StyledApp = styled.div({
  height: "100%",
  display: "grid",
  gridTemplateRows: "48px 1fr",
});
