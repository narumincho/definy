import * as React from "react";
import { createRandomId } from "../../common/util";
import { css } from "@emotion/css";

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
  return {
    addMessage: React.useCallback((newMessage) => {
      setMessageList((oldMessageList) => [
        ...oldMessageList,
        { ...newMessage, id: createRandomId() },
      ]);
    }, []),
    element: (
      <div
        className={css({
          display: "gird",
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
              })}
            >
              {message.text}
            </div>
          ))}
      </div>
    ),
  };
};
