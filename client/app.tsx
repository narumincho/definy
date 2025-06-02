export const App = (
  {
    state,
    setState,
    onOpenCreateAccountDialog,
    onOpenSigninDialog,
  }: {
    readonly state: number;
    readonly setState: (updateFunc: (prev: number) => number) => void;
    readonly onOpenCreateAccountDialog: () => void;
    readonly onOpenSigninDialog: () => void;
  },
) => {
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
          setState((prev) => prev + 1);
        }}
      >
        count: {state}
      </button>
      <button type="button" onClick={onOpenCreateAccountDialog}>
        Create Account
      </button>
      <button type="button" onClick={onOpenSigninDialog}>
        Log in
      </button>
    </div>
  );
};
