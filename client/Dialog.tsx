import { PropsWithChildren, useEffect, useRef } from "@hono/hono/jsx";

export const Dialog = (
  props: PropsWithChildren<{
    readonly isOpen: boolean;
    readonly onClose: () => void;
  }>,
) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.addEventListener("close", props.onClose);
    const clickHandler = (event: MouseEvent) => {
      if (event.target instanceof HTMLElement) {
        if (event.target.closest("form") === null) {
          props.onClose();
        }
      }
    };
    ref.current?.addEventListener("click", clickHandler);
    return () => {
      ref.current?.removeEventListener("close", props.onClose);
      ref.current?.removeEventListener("click", clickHandler);
    };
  }, [props.onClose, ref.current]);

  useEffect(() => {
    if (props.isOpen) {
      ref.current?.showModal();
    } else {
      ref.current?.close();
    }
  }, [props.isOpen]);

  if (!props.isOpen) {
    return null;
  }

  return (
    <dialog
      ref={ref}
      style={{
        width: "80%",
        boxShadow: "0px 20px 36px 0px rgba(0, 0, 0, 0.6)",
      }}
    >
      {props.children}
    </dialog>
  );
};
