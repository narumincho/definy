#[derive(Clone)]
pub struct AppState {
    pub login_or_create_account_dialog_state: LoginOrCreateAccountDialogState,
    pub created_account_events: Vec<(ed25519_dalek::Signature, definy_event::CreateAccountEvent)>,
}

#[derive(Clone)]
pub struct LoginOrCreateAccountDialogState {
    pub generated_key: Option<ed25519_dalek::SigningKey>,
    pub creating_account: CreatingAccountState,
    pub username: String,
}

#[derive(Clone, PartialEq)]
pub enum CreatingAccountState {
    NotStarted,
    Requesting,
    Success,
    Error,
}
