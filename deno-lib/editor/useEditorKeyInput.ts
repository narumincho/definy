import React from "https://esm.sh/react@18.2.0?pin=v102";

export const useEditorKeyInput = ({
  disabled,
  onDown,
  onUp,
  onEnter,
}: {
  readonly disabled: boolean;
  readonly onDown: () => void;
  readonly onUp: () => void;
  readonly onEnter: () => void;
}) => {
  React.useEffect(() => {
    console.log("reset!");
    const handleKeyEvent = (e: KeyboardEvent) => {
      // 入力中はなにもしない
      if (disabled) {
        return;
      }
      console.log(e.code);
      if (e.code === "Enter") {
        onEnter();
        e.preventDefault();
        return;
      }
      if (e.code === "ArrowUp" || e.code === "KeyW") {
        onUp();
        e.preventDefault();
        return;
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        onDown();
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyEvent);

    return () => {
      document.removeEventListener("keydown", handleKeyEvent);
    };
  }, [disabled, onEnter, onUp, onDown]);
};
