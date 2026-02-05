#[derive(Clone)]
pub struct AppState {
    pub login_or_create_account_dialog_state: LoginOrCreateAccountDialogState,
    pub created_account_events: Vec<(ed25519_dalek::Signature, definy_event::event::Event)>,
    pub current_key: Option<ed25519_dalek::SigningKey>,
}

#[derive(Clone)]
pub struct LoginOrCreateAccountDialogState {
    /// アカウント作成で生成した秘密鍵
    pub generated_key: Option<ed25519_dalek::SigningKey>,
    /// アカウント作成のユーザー名
    pub username: String,

    /// ログインまたはアカウント作成の状態
    pub state: CreatingAccountState,

    /// ログインの現在のパスワード
    pub current_password: String,
}

#[derive(Clone, PartialEq)]
pub enum CreatingAccountState {
    Init,
    LogIn,
    CreateAccount,
    CreateAccountRequesting,
    Success,
    Error,
}
