import { Dialog } from "./Dialog.tsx";

export const SigInDialog = ({ onClose }: {
  readonly onClose: () => void;
}) => {
  return (
    <Dialog
      isOpen
      onClose={onClose}
    >
      <form
        method="dialog"
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
          }}
        >
          <h2
            style={{
              margin: 0,
              flexGrow: 1,
            }}
          >
            Log in
          </h2>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        <label>
          <div>Username</div>
          <input type="text" required />
        </label>
        <label>
          <div>
            Password
          </div>
          <input
            type="password"
            autoComplete="current-password"
          />
        </label>
        <button type="submit">Log in</button>
      </form>
    </Dialog>
  );
};
