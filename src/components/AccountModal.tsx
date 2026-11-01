import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type JSX,
  type FormEvent,
} from "react";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { AccountsIcon } from "../icons.tsx";

type AccountModalProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

export function AccountModal({
  open,
  onClose,
}: AccountModalProps): JSX.Element {
  const {
    language,
    currentAccount,
    loginWithSecretKey,
    createAccountAndLogin,
    logout,
  } = useDefiny();

  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [activeTab, setActiveTab] = useState<"create" | "login">("create");
  const [createName, setCreateName] = useState("");
  const [loginSecretKey, setLoginSecretKey] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Sync dialog open state with native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      setErrorMessage(null);
      setNewlyCreatedKey(null);
    }
  }, [open]);

  // Fallback light-dismiss for browsers without closedby support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const handleDialogClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isInside) {
          onClose();
        }
      };
      dialog.addEventListener("click", handleDialogClick);
      return () => {
        dialog.removeEventListener("click", handleDialogClick);
      };
    }
  }, [onClose]);

  const handleCreateSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!createName.trim()) return;

      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await createAccountAndLogin(createName.trim());
        setNewlyCreatedKey(res.secretKeyBase64);
        setCreateName("");
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [createName, createAccountAndLogin],
  );

  const handleLoginSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!loginSecretKey.trim()) return;

      setLoading(true);
      setErrorMessage(null);
      try {
        await loginWithSecretKey(loginSecretKey.trim(), loginName.trim());
        setLoginSecretKey("");
        setLoginName("");
        onClose();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [loginSecretKey, loginName, loginWithSecretKey, onClose],
  );

  const copyToClipboard = useCallback(
    async (text: string, setCopied: (v: boolean) => void) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch {
        // clipboard unavailable
      }
    },
    [],
  );

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="account-modal-title"
      onClose={onClose}
      className="account-modal-dialog"
    >
      {open && (
        <>
          <div className="account-modal-header">
            <h2 id="account-modal-title" className="account-modal-title">
              {currentAccount
                ? label(language, "Account", "アカウント", "Konto")
                : label(
                    language,
                    "Log In or Create Account",
                    "ログイン・アカウント作成",
                    "Ensaluti / Krei konton",
                  )}
            </h2>
            <button
              type="button"
              className="account-modal-close"
              onClick={onClose}
              aria-label={label(language, "Close", "閉じる", "Fermi")}
            >
              ✕
            </button>
          </div>

          {errorMessage && (
            <div
              className="alert alert-danger"
              style={{ marginBottom: "1rem" }}
            >
              {errorMessage}
            </div>
          )}

          {newlyCreatedKey ? (
            <div className="account-created-success">
              <div
                className="alert alert-success"
                style={{ marginBottom: "1rem" }}
              >
                🎉{" "}
                {label(
                  language,
                  "Account created and signed successfully!",
                  "アカウントの作成と署名に成功しました！",
                  "Konto sukcese kreita!",
                )}
              </div>
              <p>
                {label(
                  language,
                  "Please copy and save your secret key in a safe place (like a password manager). You will need it to log in on other devices:",
                  "以下の秘密鍵をパスワードマネージャー等に安全に保存してください。別端末でのログインに必要です:",
                  "Bonvolu konservi vian sekretan ŝlosilon:",
                )}
              </p>
              <div className="secret-key-display font-mono">
                {newlyCreatedKey}
              </div>
              <div
                style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem" }}
              >
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    void copyToClipboard(newlyCreatedKey, setCopiedKey);
                  }}
                >
                  {copiedKey
                    ? label(language, "Copied!", "コピー完了！", "Kopiita!")
                    : label(
                        language,
                        "Copy Secret Key",
                        "秘密鍵をコピー",
                        "Kopii ŝlosilon",
                      )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setNewlyCreatedKey(null);
                    onClose();
                  }}
                >
                  {label(language, "Done", "完了", "Farita")}
                </button>
              </div>
            </div>
          ) : currentAccount ? (
            <div className="account-profile-view">
              <div className="account-avatar-large">
                {currentAccount.accountName.slice(0, 2).toUpperCase()}
              </div>
              <div className="account-info-block">
                <h3 className="account-display-name">
                  {currentAccount.accountName}
                </h3>
                <div className="account-id-row">
                  <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                    ID:
                  </span>
                  <span className="font-mono text-muted account-id-text">
                    {currentAccount.accountId}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => {
                      void copyToClipboard(
                        currentAccount.accountId,
                        setCopiedId,
                      );
                    }}
                  >
                    {copiedId
                      ? label(language, "Copied!", "コピー済み", "Kopiita!")
                      : label(language, "Copy ID", "IDをコピー", "Kopii ID")}
                  </button>
                </div>
              </div>

              {currentAccount.secretKeyBase64 && (
                <div className="secret-key-box card">
                  <div className="secret-key-header">
                    <strong>
                      {label(
                        language,
                        "Secret Key",
                        "秘密鍵",
                        "Sekreta ŝlosilo",
                      )}
                    </strong>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setShowSecretKey(!showSecretKey);
                      }}
                    >
                      {showSecretKey
                        ? label(language, "Hide", "非表示", "Kaŝi")
                        : label(language, "Show", "表示", "Montri")}
                    </button>
                  </div>
                  <p className="hint">
                    {label(
                      language,
                      "Save this secret key securely. It allows you to sign commits and log in on any device.",
                      "この秘密鍵を安全に保管してください。他端末でのログインやコミット署名に使用します。",
                      "Konservu ĉi tiun ŝlosilon sekure.",
                    )}
                  </p>
                  <div className="secret-key-display font-mono">
                    {showSecretKey
                      ? currentAccount.secretKeyBase64
                      : "•••••••••••••••••••••••••••••••••••••••••••"}
                  </div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => {
                        void copyToClipboard(
                          currentAccount.secretKeyBase64 ?? "",
                          setCopiedKey,
                        );
                      }}
                    >
                      {copiedKey
                        ? label(language, "Copied!", "コピー完了", "Kopiita!")
                        : label(
                            language,
                            "Copy Secret Key",
                            "秘密鍵をコピー",
                            "Kopii ŝlosilon",
                          )}
                    </button>
                  </div>
                </div>
              )}

              <div
                className="dialog-buttons"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                >
                  {label(language, "Log Out", "ログアウト", "Elsaluti")}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onClose}
                >
                  {label(language, "Close", "閉じる", "Fermi")}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                className="tab-buttons"
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "1.2rem",
                }}
              >
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === "create" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setActiveTab("create");
                    setErrorMessage(null);
                  }}
                >
                  <AccountsIcon size={14} className="btn-icon" />
                  {label(
                    language,
                    "Create Account",
                    "新規アカウント作成",
                    "Krei konton",
                  )}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === "login" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setActiveTab("login");
                    setErrorMessage(null);
                  }}
                >
                  {label(
                    language,
                    "Log In with Secret Key",
                    "秘密鍵でログイン",
                    "Ensaluti per ŝlosilo",
                  )}
                </button>
              </div>

              {activeTab === "create" ? (
                <form onSubmit={handleCreateSubmit}>
                  <div className="form-group">
                    <label htmlFor="create-account-name">
                      {label(
                        language,
                        "Account Name",
                        "アカウント名",
                        "Kontnomo",
                      )}
                    </label>
                    <input
                      id="create-account-name"
                      type="text"
                      placeholder="e.g. narumincho, alice"
                      value={createName}
                      onChange={(e) => {
                        setCreateName(e.target.value);
                      }}
                      required
                      autoFocus
                    />
                    <span className="hint">
                      {label(
                        language,
                        "A cryptographic Ed25519 keypair will be generated in your browser and registered to the definy event log.",
                        "ブラウザ内で暗号学的な Ed25519 鍵ペアが生成され、definy のイベントログに登録されます。",
                        "Ed25519-ŝlosilparo estos generita en via retumilo.",
                      )}
                    </span>
                  </div>
                  <div className="dialog-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={onClose}
                    >
                      {label(language, "Cancel", "キャンセル", "Nuligi")}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={loading || !createName.trim()}
                    >
                      {loading
                        ? label(
                            language,
                            "Creating...",
                            "作成中...",
                            "Kreante...",
                          )
                        : label(
                            language,
                            "Create Account",
                            "アカウントを作成",
                            "Krei konton",
                          )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label htmlFor="login-secret-key">
                      {label(
                        language,
                        "Secret Key (32-byte URL-safe Base64)",
                        "秘密鍵 (32バイト URL-safe Base64)",
                        "Sekreta ŝlosilo",
                      )}
                    </label>
                    <input
                      id="login-secret-key"
                      type="password"
                      placeholder="e.g. sNvtNo3axWHwTIJ-dr92fQ_lhE1kKd-5E-n9-hC478o"
                      value={loginSecretKey}
                      onChange={(e) => {
                        setLoginSecretKey(e.target.value);
                      }}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="login-account-name">
                      {label(
                        language,
                        "Account Name (Optional)",
                        "表示アカウント名 (任意)",
                        "Kontnomo (nedeviga)",
                      )}
                    </label>
                    <input
                      id="login-account-name"
                      type="text"
                      placeholder="e.g. alice"
                      value={loginName}
                      onChange={(e) => {
                        setLoginName(e.target.value);
                      }}
                    />
                    <span className="hint">
                      {label(
                        language,
                        "If left blank, the name from previous CreateAccount events or your public key ID will be used.",
                        "未入力の場合、過去のイベントや公開鍵 ID が使用されます。",
                        "Se malplena, la nomo el eventoj estos uzata.",
                      )}
                    </span>
                  </div>
                  <div className="dialog-buttons">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={onClose}
                    >
                      {label(language, "Cancel", "キャンセル", "Nuligi")}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={loading || !loginSecretKey.trim()}
                    >
                      {loading
                        ? label(
                            language,
                            "Logging In...",
                            "ログイン中...",
                            "Ensalutante...",
                          )
                        : label(language, "Log In", "ログイン", "Ensaluti")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
