#[derive(Clone)]
pub struct AppState {
    pub login_or_create_account_dialog_state: LoginOrCreateAccountDialogState,
    pub created_account_events: Vec<(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )>,
    pub current_key: Option<ed25519_dalek::SigningKey>,
    pub message_input: String,
    pub profile_name_input: String,
    pub location: Option<Location>,
}

impl AppState {
    pub fn account_name_map(
        &self,
    ) -> std::collections::HashMap<definy_event::event::AccountId, Box<str>> {
        let mut account_name_map = std::collections::HashMap::new();
        for (_, event_result) in &self.created_account_events {
            if let Ok((_, event)) = event_result {
                match &event.content {
                    definy_event::event::EventContent::CreateAccount(create_account_event) => {
                        account_name_map
                            .entry(event.account_id.clone())
                            .or_insert_with(|| create_account_event.account_name.clone());
                    }
                    definy_event::event::EventContent::ChangeProfile(change_profile_event) => {
                        account_name_map
                            .entry(event.account_id.clone())
                            .or_insert_with(|| change_profile_event.account_name.clone());
                    }
                    definy_event::event::EventContent::Message(_) => {}
                }
            }
        }
        account_name_map
    }
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
    LogIn,
    CreateAccount,
    CreateAccountRequesting,
    Success,
    Error,
}

#[derive(Clone, PartialEq)]
pub enum Location {
    Home,
    Event([u8; 32]),
}

impl narumincho_vdom::Route for Location {
    fn to_url(&self) -> String {
        match self {
            Location::Home => "/".to_string(),
            Location::Event(hash) => format!(
                "/events/{}",
                base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, hash)
            ),
        }
    }

    fn from_url(url: &str) -> Option<Self> {
        let parts: Vec<&str> = url.trim_matches('/').split('/').collect();
        match parts.as_slice() {
            [""] => Some(Location::Home),
            ["events", hash_str] => {
                let bytes = base64::Engine::decode(
                    &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                    hash_str,
                )
                .ok()?;
                if bytes.len() == 32 {
                    let mut hash = [0u8; 32];
                    hash.copy_from_slice(&bytes);
                    Some(Location::Event(hash))
                } else {
                    None
                }
            }
            _ => None,
        }
    }
}
