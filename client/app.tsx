export const App = (props: {
  readonly state: number;
  readonly privateKey: Uint8Array | null;
  readonly setState: (updateFunc: (prev: number) => number) => void;
  readonly signUp: () => void;
  readonly copyPassword: () => void;
}) => {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      <h1
        style={{
          margin: 0,
          padding: 16,
        }}
      >
        definy
      </h1>
      <button
        type="button"
        onClick={() => {
          props.setState((prev) => prev + 1);
        }}
      >
        count: {props.state}
      </button>
      <button type="button" onClick={props.signUp}>
        Sign Up
      </button>
    </div>
  );
};
