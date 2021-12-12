type PatchState<Message> = {
  readonly clickEventHandler: (path: string, mouseEvent: MouseEvent) => void;
  readonly changeEventHandler: (path: string) => void;
  readonly inputEventHandler: (path: string, inputEvent: InputEvent) => void;
  readonly setMessageDataMap: (newMap: NewMessageMap<Message>) => void;
};

type ClickMessageData<Message> = {
  readonly stopPropagation: boolean;
  readonly message: Message;
  readonly url: string | null;
};

type PathAndMessageData<MessageData> = {
  readonly path: string;
  readonly messageData: MessageData;
};

type StateAndMessageList<State, Message> = {
  readonly state: State;
  readonly messageList: ReadonlyArray<Message>;
};
type ClientStartOption<State, Message, View> = {
  readonly initStateAndMessageList: StateAndMessageList<State, Message>;
  readonly stateToView: (stateValue: State) => View;
  readonly renderView: (
    viewValue: View,
    patchState: PatchState<Message>
  ) => void;
  readonly update: (messageValue: Message, stateValue: State) => State;
};

type NewMessageMap<Message> = {
  readonly click: ReadonlyArray<PathAndMessageData<ClickMessageData<Message>>>;
  readonly change: ReadonlyArray<PathAndMessageData<Message>>;
  readonly input: ReadonlyArray<
    PathAndMessageData<(newText: string) => Message>
  >;
};

export const start = <State, Message, View>(
  option: ClientStartOption<State, Message, View>
): void => {
  /**
   * applyViewをする前に事前に実行する必要あり
   */
  const createPatchState = (): PatchState<Message> => {
    let clickMessageDataMap: ReadonlyMap<
      string,
      ClickMessageData<Message>
    > = new Map();
    let changeMessageDataMap: ReadonlyMap<string, Message> = new Map();
    let inputMessageDataMap: ReadonlyMap<string, (newText: string) => Message> =
      new Map();
    return {
      clickEventHandler: (path: string, mouseEvent: MouseEvent): void => {
        const messageData = clickMessageDataMap.get(path);
        console.log("クリックを検知した!", path, mouseEvent, messageData);
        if (messageData === undefined) {
          return;
        }
        if (messageData.stopPropagation) {
          mouseEvent.stopPropagation();
        }
        if (typeof messageData.url === "string") {
          history.pushState(undefined, "", messageData.url);
        }
        pushMessageList(messageData.message);
      },
      changeEventHandler: (path: string) => {
        const messageData = changeMessageDataMap.get(path);
        if (messageData === undefined) {
          return;
        }
        pushMessageList(messageData);
      },
      inputEventHandler: (path: string, inputEvent: InputEvent) => {
        const messageData = inputMessageDataMap.get(path);
        if (messageData === undefined) {
          return;
        }
        pushMessageList(
          messageData((inputEvent.target as HTMLInputElement).value)
        );
      },
      setMessageDataMap: (newMessageMap) => {
        clickMessageDataMap = new Map(
          newMessageMap.click.map((e) => [e.path, e.messageData])
        );
        changeMessageDataMap = new Map(
          newMessageMap.change.map((e) => [e.path, e.messageData])
        );
        inputMessageDataMap = new Map(
          newMessageMap.input.map((e) => [e.path, e.messageData])
        );
      },
    };
  };

  const pushMessageList = (message: Message): void => {
    messageList.push(message);
  };

  const loop = (): void => {
    requestAnimationFrame(loop);
    if (messageList.length === 0) {
      return;
    }
    console.log("handle message!", [...messageList]);

    while (true) {
      const message = messageList.shift();
      if (message === undefined) {
        break;
      }
      state = option.update(message, state);
    }
    const newView = option.stateToView(state);
    console.log({ state, newView });
    oldView = newView;
    option.renderView(newView, patchState);
  };

  const stateAndMessageList = option.initStateAndMessageList;
  let state: State = option.initStateAndMessageList.state;
  const messageList: Array<Message> = [
    ...option.initStateAndMessageList.messageList,
  ];
  let oldView = option.stateToView(stateAndMessageList.state);
  const patchState = createPatchState();
  option.renderView(oldView, patchState);
  loop();
};
