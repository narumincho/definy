import React from "https://esm.sh/react@18.2.0?pin=v119";
import { styled } from "https://esm.sh/@stitches/react@1.2.8?pin=v119";
import { createRandomId } from "../util.ts";

export type Message = {
  readonly id: string;
  readonly type: "error" | "success";
  readonly text: string;
};

export type AddMessage = (message: Pick<Message, "type" | "text">) => void;

const Container = styled("div", {
  display: "grid",
  gap: 8,
});

const StyledMessage = styled("div", {
  flexGrow: "1",
});

const StyledItem = styled("div", {
  padding: 8,
  color: "#111",
  display: "flex",
  variants: {
    type: {
      success: {
        backgroundColor: "skyblue",
      },
      error: {
        backgroundColor: "red",
      },
    },
  },
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
      <Container>
        {[...messageList]
          .slice(messageList.length - 4, messageList.length)
          .map((message) => (
            <StyledItem
              key={message.id}
              type={message.type}
            >
              <StyledMessage>{message.text}</StyledMessage>
              <button
                onClick={() => {
                  setMessageList((old) =>
                    old.filter((m) => m.id !== message.id)
                  );
                }}
              >
                x
              </button>
            </StyledItem>
          ))}
      </Container>
    ),
  };
};
