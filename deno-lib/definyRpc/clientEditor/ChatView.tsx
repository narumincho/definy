import React, {
  ReactElement,
  useState,
} from "https://esm.sh/react@18.2.0?pin=v111";
import { styled } from "./style.ts";
import { Select } from "./Select.tsx";
import { FunctionAndTypeList } from "./Editor.tsx";

const Container = styled("div", {
  display: "grid",
  gridTemplateRows: "1fr auto",
});

const InputArea = styled("div", {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
});

export const ChatView = (
  props: { readonly functionAndTypeList: FunctionAndTypeList | undefined },
): React.ReactElement => {
  const [selectedFunc, setSelectedFunc] = React.useState<string | undefined>(
    undefined,
  );
  return (
    <Container>
      <div>
        output....
      </div>
      <InputArea>
        <Select
          values={props.functionAndTypeList?.funcList}
          value={selectedFunc}
          onSelect={(e) => {
            setSelectedFunc(e);
          }}
        />
        <button>send</button>
      </InputArea>
    </Container>
  );
};
