import React from "https://esm.sh/react@18.2.0?pin=v106";
import { c, toStyleAndHash } from "../cssInJs/mod.ts";
import { createRandomId } from "../util.ts";

export type Message = {
  readonly id: string;
  readonly type: "error" | "success";
  readonly text: string;
};

export type AddMessage = (message: Pick<Message, "type" | "text">) => void;

const containerStyle = toStyleAndHash({
  display: "grid",
  gap: 8,
});

const messageStyle = toStyleAndHash({
  flexGrow: "1",
});

export const useNotification = (): {
  readonly addMessage: AddMessage;
  readonly element: React.ReactElement;
} => {
  const [messageList, setMessageList] = React.useState<ReadonlyArray<Message>>(
    [],
  );

  const addMessage = React.useCallback<AddMessage>((newMessage) => {
    setMessageList((oldMessageList) => [
      ...oldMessageList,
      { ...newMessage, id: createRandomId() },
    ]);
  }, []);

  return {
    addMessage,
    element: (
      <div className={c(containerStyle)}>
        {[...messageList]
          .slice(messageList.length - 4, messageList.length)
          .map((message) => (
            <div
              key={message.id}
              className={c(
                toStyleAndHash({
                  backgroundColor: message.type === "success"
                    ? "skyblue"
                    : "red",
                  padding: 8,
                  color: "#111",
                  display: "flex",
                }),
              )}
            >
              <div className={c(messageStyle)}>{message.text}</div>
              <button
                onClick={() => {
                  setMessageList((old) =>
                    old.filter((m) => m.id !== message.id)
                  );
                }}
              >
                x
              </button>
            </div>
          ))}
      </div>
    ),
  };
};
