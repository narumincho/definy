import { ChangeEvent, Component, ReactElement, createRef } from "react";
import { css, jsx as h } from "@emotion/react";

type Props = {
  readonly name: string;
  readonly initValue: string;
  readonly onChange: (
    value: string,
    event: ChangeEvent<HTMLTextAreaElement>
  ) => void;
  readonly onBlur: (value: string) => void;
};

type State = {
  readonly value: string;
};

export class MultiLineTextInput extends Component<Props, State> {
  ref: React.RefObject<HTMLTextAreaElement>;

  constructor(props: Props) {
    super(props);
    this.ref = createRef();
    this.state = { value: props.initValue };
  }

  onChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    this.props.onChange(event.target.value, event);
    this.setState({ value: event.target.value });
  }

  onBlur(): void {
    this.props.onBlur(this.state.value);
  }

  componentDidUpdate(): void {
    if (this.ref.current === null) {
      return;
    }
    this.ref.current.rows = 1;
    // 中身の大きさが表示の大きさより等しいか小さくなるまで行数を増やす. 最大20行まで
    while (true) {
      if (
        this.ref.current.scrollHeight <= this.ref.current.clientHeight ||
        this.ref.current.rows > 20
      ) {
        return;
      }
      this.ref.current.rows += 1;
    }
  }

  render(): ReactElement {
    return h("textarea", {
      name: this.props.name,
      onChange: (event: ChangeEvent<HTMLTextAreaElement>): void =>
        this.onChange(event),
      onBlur: () => this.onBlur(),
      value: this.state.value,
      ref: this.ref,
      css: css({
        padding: 8,
        fontSize: 16,
        border: "2px solid #222",
        backgroundColor: "#000",
        color: "#ddd",
        borderRadius: 8,
        resize: "none",
        lineHeight: 1.5,

        "&:focus": {
          border: "2px solid #f0932b",
          outline: "none",
        },
      }),
    });
  }
}
