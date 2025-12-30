import { useEffect, useState } from "preact/hooks";
import { AccountId, SecretKey, secretKeyToAccountId } from "../event/key.ts";

export function App(
  {
    secretKey,
    onOpenCreateAccountDialog,
    onOpenSigninDialog,
    onLogout,
  }: {
    readonly secretKey: SecretKey | null;
    readonly onOpenCreateAccountDialog: () => void;
    readonly onOpenSigninDialog: () => void;
    readonly onLogout: () => void;
  },
) {
  const [accountId, setAccountId] = useState<AccountId | null>(null);

  useEffect(() => {
    if (secretKey) {
      secretKeyToAccountId(secretKey).then((accountId) => {
        setAccountId(accountId);
      });
    }
  }, [secretKey]);

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
      {secretKey
        ? (
          <div>
            <button type="button" onClick={onLogout}>
              Log out
            </button>
            ログイン中 アカウントID:{" "}
            {accountId?.toBase64({ alphabet: "base64url" })}
          </div>
        )
        : (
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
