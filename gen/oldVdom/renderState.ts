import * as v from "./view";

export type RenderState<Message> = {
  readonly clickEventHandler: (path: string, mouseEvent: MouseEvent) => void;
  readonly changeEventHandler: (path: string) => void;
  readonly inputEventHandler: (path: string, inputEvent: InputEvent) => void;
  readonly setMessageDataMap: (messageData: v.MessageData<Message>) => void;
  readonly pointerMoveHandler: (pointerEvent: PointerEvent) => void;
  readonly pointerDownHandler: (pointerEvent: PointerEvent) => void;
};

/**
 * イベントを受け取る関数の指定をして, ブラウザで描画する前の準備をする
 *  @param messageHandler メッセージーを受け取る関数
 */
export const useRenderState = <Message>(
  messageHandler: (message: Message) => void
): RenderState<Message> => {
  let messageData: v.MessageData<Message> = {
    messageMap: new Map(),
    pointerMove: undefined,
    pointerDown: undefined,
  };

  return {
    clickEventHandler(path: string, mouseEvent: MouseEvent): void {
      const eventData = messageData.messageMap.get(path);
      if (eventData === undefined) {
        return;
      }
      const clickMessage = eventData.onClick;
      if (clickMessage === undefined) {
        return;
      }
      if (clickMessage.ignoreNewTab) {
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
      if (clickMessage.stopPropagation) {
        mouseEvent.stopPropagation();
      }
      messageHandler(clickMessage.message);
    },
    changeEventHandler(path: string): void {
      const eventData = messageData.messageMap.get(path);
      if (eventData === undefined) {
        return;
      }
      const changeMessage = eventData.onChange;
      if (changeMessage === undefined) {
        return;
      }
      messageHandler(changeMessage);
    },
    inputEventHandler(path: string, inputEvent: InputEvent): void {
      const eventData = messageData.messageMap.get(path);
      if (eventData === undefined) {
        return;
      }
      const inputMessage = eventData.onInput;
      if (inputMessage === undefined) {
        return;
      }
      messageHandler(
        inputMessage(
          (inputEvent.target as HTMLInputElement | HTMLTextAreaElement).value
        )
      );
    },
    setMessageDataMap(newMessageData: v.MessageData<Message>): void {
      messageData = newMessageData;
    },
    pointerMoveHandler(pointerEvent: PointerEvent): void {
      if (messageData.pointerMove !== undefined) {
        messageHandler(
          messageData.pointerMove(pointerEventToPointer(pointerEvent))
        );
      }
    },
    pointerDownHandler(pointerEvent: PointerEvent): void {
      if (messageData.pointerDown !== undefined) {
        messageHandler(
          messageData.pointerDown(pointerEventToPointer(pointerEvent))
        );
      }
    },
  };
};

const pointerEventToPointer = (pointerEvent: PointerEvent): v.Pointer => {
  return {
    x: pointerEvent.clientX,
    y: pointerEvent.clientY,
    width: pointerEvent.width,
    height: pointerEvent.height,
    isPrimary: pointerEvent.isPrimary,
    pointerId: pointerEvent.pointerId,
    pointerType: pointerTypeToSimple(pointerEvent.pointerType),
    pressure: pointerEvent.pressure,
    tangentialPressure: pointerEvent.tangentialPressure,
    tiltX: pointerEvent.tiltX,
    tiltY: pointerEvent.tiltY,
    twist: pointerEvent.twist,
  };
};

const pointerTypeToSimple = (pointerType: string): v.PointerType => {
  if (
    pointerType === "mouse" ||
    pointerType === "pen" ||
    pointerType === "touch" ||
    pointerType === ""
  ) {
    return pointerType;
  }
  console.info("仕様書で定められていない pointerTypeだ", pointerType);
  return "";
};
