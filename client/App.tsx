import { AccountId, SecretKey } from "../event/key.ts";

export type LogInState = {
  readonly type: "loading";
} | {
  readonly type: "noLogIn";
} | {
  readonly type: "logIn";
  readonly secretKey: SecretKey;
  readonly accountId: AccountId | undefined;
};

export function App(
  {
    logInState,
    onOpenCreateAccountDialog,
    onOpenSigninDialog,
    onLogout,
  }: {
    readonly logInState: LogInState;
    readonly onOpenCreateAccountDialog: () => void;
    readonly onOpenSigninDialog: () => void;
    readonly onLogout: () => void;
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
      開発中...

      {logInState.type === "loading"
        ? (
          <div>
            ログイン状態を読み込み中...
          </div>
        )
        : logInState.type === "logIn"
        ? (
          <div>
            <button type="button" onClick={onLogout}>
              ログアウト
            </button>
            ログイン中 アカウントID:{" "}
            {logInState.accountId?.toBase64({ alphabet: "base64url" })}
          </div>
        )
        : (
          <div>
            <button type="button" onClick={onOpenCreateAccountDialog}>
              アカウントを作成する
            </button>
            <button type="button" onClick={onOpenSigninDialog}>
              ログインする
            </button>
          </div>
        )}
    </div>
  );
}
