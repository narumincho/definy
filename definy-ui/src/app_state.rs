use definy_event::event::AccountId;

#[derive(Clone, PartialEq, Eq, Debug)]
pub enum PathStep {
    Left,
    Right,
    Condition,
    Then,
    Else,
    LetValue,
    LetBody,
    ListItemValue(usize),
    RecordItemValue(usize),
    ConstructorValue,
    TypeListItem,
}

impl PathStep {
    pub fn to_string(&self) -> String {
        match self {
            PathStep::Left => "Left".to_string(),
            PathStep::Right => "Right".to_string(),
            PathStep::Condition => "Condition".to_string(),
            PathStep::Then => "Then".to_string(),
            PathStep::Else => "Else".to_string(),
            PathStep::LetValue => "LetValue".to_string(),
            PathStep::LetBody => "LetBody".to_string(),
            PathStep::ListItemValue(index) => format!("ListItemValue({})", index),
            PathStep::RecordItemValue(index) => format!("RecordItemValue({})", index),
            PathStep::ConstructorValue => "ConstructorValue".to_string(),
            PathStep::TypeListItem => "TypeListItem".to_string(),
        }
    }

    pub fn from_string(s: &str) -> Option<Self> {
        if s == "Left" {
            Some(PathStep::Left)
        } else if s == "Right" {
            Some(PathStep::Right)
        } else if s == "Condition" {
            Some(PathStep::Condition)
        } else if s == "Then" {
            Some(PathStep::Then)
        } else if s == "Else" {
            Some(PathStep::Else)
        } else if s == "LetValue" {
            Some(PathStep::LetValue)
        } else if s == "LetBody" {
            Some(PathStep::LetBody)
        } else if s.starts_with("ListItemValue(") && s.ends_with(")") {
            s[14..s.len() - 1].parse().ok().map(PathStep::ListItemValue)
        } else if s.starts_with("RecordItemValue(") && s.ends_with(")") {
            s[16..s.len() - 1]
                .parse()
                .ok()
                .map(PathStep::RecordItemValue)
        } else if s == "ConstructorValue" {
            Some(PathStep::ConstructorValue)
        } else if s == "TypeListItem" {
            Some(PathStep::TypeListItem)
        } else {
            None
        }
    }
}

pub fn path_to_string(path: &[PathStep]) -> String {
    path.iter()
        .map(|step| step.to_string())
        .collect::<Vec<String>>()
        .join(".")
}

pub fn string_to_path(s: &str) -> Option<Vec<PathStep>> {
    if s.is_empty() {
        return Some(Vec::new());
    }
    s.split('.').map(PathStep::from_string).collect()
}

use std::collections::HashMap;

#[derive(Clone)]
pub struct AppState {
    pub login_or_create_account_dialog_state: LoginOrCreateAccountDialogState,
    pub event_cache: HashMap<
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    >,
    pub event_list_state: EventListState,
    pub current_key: Option<ed25519_dalek::SigningKey>,
    pub part_definition_form: PartDefinitionFormState,
    pub part_update_form: PartUpdateFormState,
    pub event_detail_eval_result: Option<String>,
    pub profile_name_input: String,
    pub is_header_popover_open: bool,
    pub location: Option<Location>,
    pub focused_path: Option<Vec<PathStep>>,
    pub active_dropdown_name: Option<String>,
    pub dropdown_search_query: String,
}

#[derive(Clone)]
pub struct EventListState {
    pub event_hashes: Vec<[u8; 32]>,
    pub current_offset: usize,
    pub page_size: usize,
    pub is_loading: bool,
    pub has_more: bool,
    pub filter_event_type: Option<definy_event::event::EventType>,
}

#[derive(Clone)]
pub struct PartDefinitionFormState {
    pub part_name_input: String,
    pub part_type_input: Option<definy_event::event::PartType>,
    pub part_description_input: String,
    pub composing_expression: definy_event::event::Expression,
    pub eval_result: Option<String>,
}

#[derive(Clone)]
pub struct PartUpdateFormState {
    pub part_definition_event_hash: Option<[u8; 32]>,
    pub part_name_input: String,
    pub part_description_input: String,
    pub expression_input: definy_event::event::Expression,
}

impl AppState {
    pub fn account_name_map(
        &self,
    ) -> std::collections::HashMap<definy_event::event::AccountId, Box<str>> {
        let mut account_name_map = std::collections::HashMap::new();
        for event_result in self.event_cache.values() {
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
                    definy_event::event::EventContent::ModuleDefinition(_) => {}
                    definy_event::event::EventContent::ModuleUpdate(_) => {}
                }
            }
        }
        account_name_map
    }
}

pub fn account_display_name(
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
    account_id: &definy_event::event::AccountId,
) -> String {
    account_name_map
        .get(account_id)
        .map(|name| name.to_string())
        .unwrap_or_else(|| crate::hash_format::encode_bytes(account_id.0.as_ref()))
}

pub fn build_initial_state(
    location: Option<Location>,
    events: Vec<(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )>,
    event_list_loading: bool,
    event_list_has_more: bool,
    current_key: Option<ed25519_dalek::SigningKey>,
    filter_event_type: Option<definy_event::event::EventType>,
) -> AppState {
    let mut event_cache = HashMap::new();
    let mut event_hashes = Vec::new();
    for (hash, event) in events {
        event_cache.insert(hash, event);
        event_hashes.push(hash);
    }

    AppState {
        login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
            state: CreatingAccountState::LogIn,
            username: String::new(),
            generated_key: None,
            current_password: String::new(),
        },
        event_cache,
        event_list_state: EventListState {
            event_hashes,
            current_offset: 0,
            page_size: 20,
            is_loading: event_list_loading,
            has_more: event_list_has_more,
            filter_event_type,
        },
        current_key,
        part_definition_form: PartDefinitionFormState {
            part_name_input: String::new(),
            part_type_input: Some(definy_event::event::PartType::Number),
            part_description_input: String::new(),
            composing_expression: definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            ),
            eval_result: None,
        },
        part_update_form: PartUpdateFormState {
            part_definition_event_hash: None,
            part_name_input: String::new(),
            part_description_input: String::new(),
            expression_input: definy_event::event::Expression::Number(
                definy_event::event::NumberExpression { value: 0 },
            ),
        },
        event_detail_eval_result: None,
        profile_name_input: String::new(),
        is_header_popover_open: false,
        location,
        focused_path: None,
        active_dropdown_name: None,
        dropdown_search_query: String::new(),
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
    Account(AccountId),
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
                    account_id.0.as_ref()
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
            ["accounts", account_id_str] => decode_32bytes_base64(account_id_str)
                .map(|account_id_bytes| Location::Account(AccountId(Box::new(account_id_bytes)))),
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
    fn route_round_trip_cases() {
        let cases = vec![
            Location::Home,
            Location::AccountList,
            Location::PartList,
            Location::Account(definy_event::event::AccountId(Box::new([7u8; 32]))),
            Location::Part([9u8; 32]),
            Location::Event([3u8; 32]),
        ];
        for case in cases {
            let url = case.to_url();
            assert_eq!(Location::from_url(url.as_str()), Some(case));
        }
    }

    #[test]
    fn invalid_route_returns_none() {
        assert_eq!(Location::from_url("/unknown"), None);
        assert_eq!(Location::from_url("/accounts/invalid"), None);
    }
}
