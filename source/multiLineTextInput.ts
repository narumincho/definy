import {
  ChangeEvent,
  Component,
  ReactElement,
  createRef,
  createElement as h,
} from "react";
import styled from "styled-components";

type Props = {
  readonly name: string;
  readonly initValue: string;
  readonly onChange: (
    value: string,
    event: ChangeEvent<HTMLTextAreaElement>
  ) => void;
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
    return h(StyledMultiLineTextInput, {
      name: this.props.name,
      onChange: (event: ChangeEvent<HTMLTextAreaElement>): void =>
        this.onChange(event),
      value: this.state.value,
      ref: this.ref,
    });
  }
}

const StyledMultiLineTextInput = styled.textarea`
  padding: 8px;
  font-size: 16px;
  border: 2px solid #222;
  background-color: #000;
  color: #ddd;
  border-radius: 8px;
  resize: none;
  line-height: 1.5;

  &:focus {
    border: 2px solid #f0932b;
    outline: none;
  }
`;
