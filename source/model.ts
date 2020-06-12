import {
  ClientMode,
  Language,
  OpenIdConnectProvider,
} from "definy-common/source/data";

export type LogInState =
  | { _: "Guest" }
  | { _: "RequestingLogInUrl"; provider: OpenIdConnectProvider };

export type Model = {
  logInState: LogInState;
  language: Language;
  clientMode: ClientMode;
};
