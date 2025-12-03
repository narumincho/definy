export function App(
  {
    state,
    setState,
    accountId,
    onOpenCreateAccountDialog,
    onOpenSigninDialog,
  }: {
    readonly state: number;
    readonly setState: (updateFunc: (prev: number) => number) => void;
    readonly accountId: string | null;
    readonly onOpenCreateAccountDialog: () => void;
    readonly onOpenSigninDialog: () => void;
  },
) {
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
      {accountId ? <div>ログイン中 アカウントID: {accountId}</div> : (
        <>
          <button type="button" onClick={onOpenCreateAccountDialog}>
            Create Account
          </button>
          <button type="button" onClick={onOpenSigninDialog}>
            Log in
          </button>
        </>
      )}
    </div>
  );
}
