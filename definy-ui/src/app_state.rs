#[derive(Clone)]
pub struct AppState {
    pub count: i32,
    pub generated_key: Option<ed25519_dalek::SigningKey>,
    pub username: String,
    pub creating_account: bool,
    pub created_account_events: Vec<(ed25519_dalek::Signature, definy_event::CreateAccountEvent)>,
}
