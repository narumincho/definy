/* @jsx jsx */
import { useState, useCallback } from "https://esm.sh/react@18.2.0";
import { jsx } from "https://esm.sh/@emotion/react@11.10.5";
import { createRandomId } from "../util.ts";

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
  const [messageList, setMessageList] = useState<ReadonlyArray<Message>>([]);

  const addMessage = useCallback<AddMessage>((newMessage) => {
    setMessageList((oldMessageList) => [
      ...oldMessageList,
      { ...newMessage, id: createRandomId() },
    ]);
  }, []);

  return {
    addMessage,
    element: (
      <div
        css={{
          display: "grid",
          gap: 8,
        }}
      >
        {[...messageList]
          .slice(messageList.length - 4, messageList.length)
          .map((message) => (
            <div
              key={message.id}
              css={{
                backgroundColor: message.type === "success" ? "skyblue" : "red",
                padding: 8,
                color: "#111",
                display: "flex",
              }}
            >
              <div
                css={{
                  flexGrow: 1,
                }}
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
