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
    pub part_definition_form: PartDefinitionFormState,
    pub part_update_form: PartUpdateFormState,
    pub event_detail_eval_result: Option<String>,
    pub profile_name_input: String,
    pub is_header_popover_open: bool,
    pub location: Option<Location>,
}

#[derive(Clone)]
pub struct PartDefinitionFormState {
    pub part_name_input: String,
    pub part_description_input: String,
    pub composing_expression: definy_event::event::Expression,
    pub eval_result: Option<String>,
}

#[derive(Clone)]
pub struct PartUpdateFormState {
    pub part_name_input: String,
    pub part_description_input: String,
    pub expression_input: definy_event::event::Expression,
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
                    definy_event::event::EventContent::PartDefinition(_) => {}
                    definy_event::event::EventContent::PartUpdate(_) => {}
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

#[derive(Clone, PartialEq, Debug)]
pub enum Location {
    Home,
    AccountList,
    PartList,
    Part([u8; 32]),
    Event([u8; 32]),
    Account([u8; 32]),
}

impl narumincho_vdom::Route for Location {
    fn to_url(&self) -> String {
        match self {
            Location::Home => "/".to_string(),
            Location::AccountList => "/accounts".to_string(),
            Location::PartList => "/parts".to_string(),
            Location::Part(hash) => format!(
                "/parts/{}",
                base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, hash)
            ),
            Location::Event(hash) => format!(
                "/events/{}",
                base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, hash)
            ),
            Location::Account(account_id) => format!(
                "/accounts/{}",
                base64::Engine::encode(
                    &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                    account_id
                )
            ),
        }
    }

    fn from_url(url: &str) -> Option<Self> {
        let parts: Vec<&str> = url.trim_matches('/').split('/').collect();
        match parts.as_slice() {
            [""] => Some(Location::Home),
            ["accounts"] => Some(Location::AccountList),
            ["parts"] => Some(Location::PartList),
            ["parts", hash_str] => decode_32bytes_base64(hash_str).map(Location::Part),
            ["events", hash_str] => decode_32bytes_base64(hash_str).map(Location::Event),
            ["accounts", account_id_str] => {
                decode_32bytes_base64(account_id_str).map(Location::Account)
            }
            _ => None,
        }
    }
}

fn decode_32bytes_base64(value: &str) -> Option<[u8; 32]> {
    let bytes =
        base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, value).ok()?;
    if bytes.len() == 32 {
        let mut result = [0u8; 32];
        result.copy_from_slice(&bytes);
        Some(result)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use narumincho_vdom::Route;

    use super::Location;

    #[test]
    fn account_route_round_trip() {
        let account_id = [7u8; 32];
        let location = Location::Account(account_id);
        let url = location.to_url();
        assert_eq!(Location::from_url(url.as_str()), Some(Location::Account(account_id)));
    }

    #[test]
    fn part_list_route_round_trip() {
        let location = Location::PartList;
        let url = location.to_url();
        assert_eq!(Location::from_url(url.as_str()), Some(Location::PartList));
    }

    #[test]
    fn part_route_round_trip() {
        let hash = [9u8; 32];
        let location = Location::Part(hash);
        let url = location.to_url();
        assert_eq!(Location::from_url(url.as_str()), Some(Location::Part(hash)));
    }

    #[test]
    fn account_list_route_round_trip() {
        let location = Location::AccountList;
        let url = location.to_url();
        assert_eq!(Location::from_url(url.as_str()), Some(Location::AccountList));
    }
}
