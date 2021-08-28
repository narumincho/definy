import { View } from "./view";

export type App<State, Message> = {
  readonly stateToView: (state: State) => View<Message>;
  readonly updateState: (state: State, message: Message) => State;
  readonly initState: State;
};
