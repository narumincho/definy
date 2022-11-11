import * as React from "react";
import { css } from "@emotion/css";
import { util } from "../../deno-lib/npm";

export type Message = {
  readonly id: string;
  readonly type: "error" | "success";
  readonly text: string;
};

export type AddMessage = (message: Pick<Message, "type" | "text">) => void;

export const useNotification = (): {
  readonly addMessage: AddMessage;
  readonly element: React.ReactElement;
} => {
  const [messageList, setMessageList] = React.useState<ReadonlyArray<Message>>(
    []
  );

  const addMessage = React.useCallback<AddMessage>((newMessage) => {
    setMessageList((oldMessageList) => [
      ...oldMessageList,
      { ...newMessage, id: util.createRandomId() },
    ]);
  }, []);

  return {
    addMessage,
    element: (
      <div
        className={css({
          display: "grid",
          gap: 8,
        })}
      >
        {[...messageList]
          .slice(messageList.length - 4, messageList.length)
          .map((message) => (
            <div
              key={message.id}
              className={css({
                backgroundColor: message.type === "success" ? "skyblue" : "red",
                padding: 8,
                color: "#111",
                display: "flex",
              })}
            >
              <div
                className={css({
                  flexGrow: 1,
                })}
              >
                {message.text}
              </div>
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
