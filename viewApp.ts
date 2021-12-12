type PatchState<Message> = {
  readonly clickEventHandler: (path: string, mouseEvent: MouseEvent) => void;
  readonly changeEventHandler: (path: string) => void;
  readonly inputEventHandler: (path: string, inputEvent: InputEvent) => void;
  readonly setMessageDataMap: (
    newMap: ReadonlyArray<PathAndEvents<Message>>
  ) => void;
};

type ClickMessageData<Message> = {
  readonly ignoreNewTab: boolean;
  readonly stopPropagation: boolean;
  readonly message: Message;
};

type Events<Message> = {
  readonly onClick: ClickMessageData<Message> | null;
  readonly onChange: Message | null;
  readonly onInput: ((newText: string) => Message) | null;
};

type PathAndEvents<Message> = {
  readonly path: string;
  readonly events: Events<Message>;
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

export const start = <State, Message, View>(
  option: ClientStartOption<State, Message, View>
): void => {
  /**
   * applyViewをする前に事前に実行する必要あり
   */
  const createPatchState = (): PatchState<Message> => {
    let messageDataMap: ReadonlyMap<string, Events<Message>> = new Map();
    return {
      clickEventHandler: (path: string, mouseEvent: MouseEvent): void => {
        const messageData = messageDataMap.get(path)?.onClick;
        console.log("クリックを検知した!", path, mouseEvent, messageData);
        if (messageData === undefined || messageData === null) {
          return;
        }
        if (messageData.ignoreNewTab) {
          /*
           * リンクを
           * Ctrlなどを押しながらクリックか,
           * マウスの中ボタンでクリックした場合などは, ブラウザで新しいタブが開くので, ブラウザでページ推移をしない.
           */
          if (
            mouseEvent.ctrlKey ||
            mouseEvent.metaKey ||
            mouseEvent.shiftKey ||
            mouseEvent.button !== 0
          ) {
            return;
          }
          mouseEvent.preventDefault();
        }
        if (messageData.stopPropagation) {
          mouseEvent.stopPropagation();
        }
        pushMessageList(messageData.message);
      },
      changeEventHandler: (path: string) => {
        const messageData = messageDataMap.get(path)?.onChange;
        if (messageData === undefined || messageData === null) {
          return;
        }
        pushMessageList(messageData);
      },
      inputEventHandler: (path: string, inputEvent: InputEvent) => {
        const messageData = messageDataMap.get(path)?.onInput;
        if (messageData === undefined || messageData === null) {
          return;
        }
        pushMessageList(
          messageData((inputEvent.target as HTMLInputElement).value)
        );
      },
      setMessageDataMap: (newMapAsList) => {
        messageDataMap = new Map(newMapAsList.map((e) => [e.path, e.events]));
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
