use definy_event::{
    EventHashId,
    event::{AccountId, EventType},
};

pub type DecodedEvent = Result<
    (ed25519_dalek::Signature, definy_event::event::Event),
    definy_event::VerifyAndDeserializeError,
>;
pub type EventWithHash = (EventHashId, DecodedEvent);

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

impl std::fmt::Display for PathStep {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            PathStep::Left => "Left",
            PathStep::Right => "Right",
            PathStep::Condition => "Condition",
            PathStep::Then => "Then",
            PathStep::Else => "Else",
            PathStep::LetValue => "LetValue",
            PathStep::LetBody => "LetBody",
            PathStep::ListItemValue(index) => return write!(f, "ListItemValue({})", index),
            PathStep::RecordItemValue(index) => return write!(f, "RecordItemValue({})", index),
            PathStep::ConstructorValue => "ConstructorValue",
            PathStep::TypeListItem => "TypeListItem",
        };
        write!(f, "{}", s)
    }
}

impl PathStep {
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

use std::{collections::HashMap, str::FromStr};

#[derive(Clone)]
pub struct AppState {
    pub is_db_connected: bool,
    pub login_or_create_account_dialog_state: LoginOrCreateAccountDialogState,
    pub event_cache: HashMap<
        EventHashId,
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    >,
    pub event_list_state: EventListState,
    pub current_key: Option<ed25519_dalek::SigningKey>,
    pub part_definition_form: PartDefinitionFormState,
    pub part_update_form: PartUpdateFormState,
    pub module_definition_form: ModuleDefinitionFormState,
    pub module_update_form: ModuleUpdateFormState,
    pub event_detail_eval_result: Option<String>,
    pub profile_name_input: String,
    pub force_offline: bool,
    pub local_event_queue: LocalEventQueueState,
    pub focused_path: Option<Vec<PathStep>>,
    pub dropdown_search_query: String,
}

impl PartialEq for AppState {
    fn eq(&self, _other: &Self) -> bool {
        false
    }
}

#[derive(Clone)]
pub struct EventListState {
    pub event_hashes: Vec<EventHashId>,
    pub current_offset: usize,
    pub page_size: usize,
    pub is_loading: bool,
    pub has_more: bool,
    pub filter_event_type: Option<definy_event::event::EventType>,
}

#[derive(Clone)]
pub struct PartDefinitionFormState {
    pub is_form_open: bool,
    pub part_name_input: String,
    pub part_type_input: Option<definy_event::event::PartType>,
    pub part_description_input: String,
    pub composing_expression: Option<definy_event::event::Expression>,
    pub module_definition_event_hash: Option<EventHashId>,
    pub eval_result: Option<String>,
}

#[derive(Clone)]
pub struct PartUpdateFormState {
    pub part_definition_event_hash: Option<EventHashId>,
    pub part_name_input: String,
    pub part_description_input: String,
    pub expression_input: Option<definy_event::event::Expression>,
    pub module_definition_event_hash: Option<EventHashId>,
}

#[derive(Clone)]
pub struct ModuleDefinitionFormState {
    pub is_form_open: bool,
    pub module_name_input: String,
    pub module_description_input: String,
    pub result_message: Option<String>,
}

#[derive(Clone)]
pub struct ModuleUpdateFormState {
    pub module_definition_event_hash: Option<EventHashId>,
    pub module_name_input: String,
    pub module_description_input: String,
    pub result_message: Option<String>,
}

#[derive(Clone)]
pub struct LocalEventQueueState {
    pub items: Vec<crate::local_event::LocalEventRecord>,
    pub is_loading: bool,
    pub last_error: Option<String>,
}

impl AppState {
    pub fn account_name_map(
        &self,
    ) -> std::collections::HashMap<definy_event::event::AccountId, Box<str>> {
        let mut account_name_map = std::collections::HashMap::new();
        for (_, event) in self.event_cache.values().flatten() {
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
        account_name_map
    }

    pub fn events_with_hash(&self) -> Vec<EventWithHash> {
        self.event_cache
            .iter()
            .map(|(hash, event)| (hash.clone(), event.clone()))
            .collect()
    }
}

pub fn upsert_local_event_record(
    state: &mut AppState,
    record: crate::local_event::LocalEventRecord,
) {
    state
        .local_event_queue
        .items
        .retain(|item| item.hash != record.hash);
    state.local_event_queue.items.push(record);
    state
        .local_event_queue
        .items
        .sort_by_key(|b| std::cmp::Reverse(b.updated_at_ms));
}

pub fn replace_local_event_records(
    state: &mut AppState,
    records: Vec<crate::local_event::LocalEventRecord>,
) {
    state.local_event_queue.items = records;
    state
        .local_event_queue
        .items
        .sort_by_key(|b| std::cmp::Reverse(b.updated_at_ms));
}

pub fn account_display_name(
    account_name_map: &std::collections::HashMap<definy_event::event::AccountId, Box<str>>,
    account_id: &definy_event::event::AccountId,
) -> String {
    account_name_map
        .get(account_id)
        .map(|name| name.to_string())
        .unwrap_or_else(|| account_id.to_string())
}

pub fn build_initial_state(
    events: Vec<EventWithHash>,
    event_list_loading: bool,
    event_list_has_more: bool,
    current_key: Option<ed25519_dalek::SigningKey>,
    filter_event_type: Option<definy_event::event::EventType>,
    is_db_connected: bool,
) -> AppState {
    let mut event_cache = HashMap::new();
    let events_len = events.len();
    let mut event_hashes = Vec::with_capacity(events_len);
    for (hash, event) in events {
        event_cache.insert(hash.clone(), event);
        event_hashes.push(hash);
    }

    AppState {
        is_db_connected,
        login_or_create_account_dialog_state: LoginOrCreateAccountDialogState {
            state: CreatingAccountState::LogIn,
            username: String::new(),
            generated_key: None,
            current_password: String::new(),
            create_account_result_message: None,
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
            is_form_open: false,
            part_name_input: String::new(),
            part_type_input: None,
            part_description_input: String::new(),
            composing_expression: None,
            module_definition_event_hash: None,
            eval_result: None,
        },
        part_update_form: PartUpdateFormState {
            part_definition_event_hash: None,
            part_name_input: String::new(),
            part_description_input: String::new(),
            expression_input: None,
            module_definition_event_hash: None,
        },
        module_definition_form: ModuleDefinitionFormState {
            is_form_open: false,
            module_name_input: String::new(),
            module_description_input: String::new(),
            result_message: None,
        },
        module_update_form: ModuleUpdateFormState {
            module_definition_event_hash: None,
            module_name_input: String::new(),
            module_description_input: String::new(),
            result_message: None,
        },
        event_detail_eval_result: None,
        profile_name_input: String::new(),
        force_offline: false,
        local_event_queue: LocalEventQueueState {
            items: Vec::new(),
            is_loading: true,
            last_error: None,
        },
        focused_path: None,
        dropdown_search_query: String::new(),
    }
}

impl AppState {
    pub fn apply_latest_events(
        &mut self,
        events: Vec<EventWithHash>,
        filter_event_type: Option<definy_event::event::EventType>,
    ) {
        let events_len = events.len();
        let mut event_hashes = Vec::with_capacity(events_len);
        for (hash, event) in events {
            self.event_cache.insert(hash.clone(), event);
            event_hashes.push(hash);
        }
        self.event_list_state = EventListState {
            event_hashes,
            current_offset: 0,
            page_size: self.event_list_state.page_size,
            is_loading: false,
            has_more: events_len == self.event_list_state.page_size,
            filter_event_type,
        };
    }

    pub fn build_url(
        location: &Location,
        lang_code: &str,
        event_type: Option<EventType>,
    ) -> String {
        crate::page_context::PageContext::build_url(location, lang_code, event_type)
    }
}

pub async fn load_more_events<F>(state: AppState, set_state: std::rc::Rc<F>)
where
    F: Fn(Box<dyn FnOnce(AppState) -> AppState>) + 'static,
{
    let filter = state.event_list_state.filter_event_type;
    let page_size = state.event_list_state.page_size;
    let is_empty = state.event_list_state.event_hashes.is_empty();
    let current_offset_base = state.event_list_state.current_offset;
    set_state(Box::new(|state: AppState| {
        let mut next = state.clone();
        next.event_list_state.is_loading = true;
        next
    }));
    let current_offset = if is_empty {
        0
    } else {
        current_offset_base + page_size
    };
    let events = crate::fetch::get_events(filter, Some(page_size), Some(current_offset)).await;
    if let Ok(events) = events {
        let events_len = events.len();
        set_state(Box::new(move |state: AppState| {
            let mut event_cache = state.event_cache.clone();
            let mut event_hashes = if current_offset == 0 {
                Vec::new()
            } else {
                state.event_list_state.event_hashes.clone()
            };
            for (hash, event) in events {
                if let std::collections::hash_map::Entry::Vacant(e) =
                    event_cache.entry(hash.clone())
                {
                    e.insert(event);
                    event_hashes.push(hash);
                }
            }
            AppState {
                event_cache,
                event_list_state: crate::EventListState {
                    event_hashes,
                    current_offset,
                    page_size: state.event_list_state.page_size,
                    is_loading: false,
                    has_more: events_len == state.event_list_state.page_size,
                    filter_event_type: state.event_list_state.filter_event_type,
                },
                ..state.clone()
            }
        }));
    } else {
        set_state(Box::new(|state: AppState| {
            let mut next = state.clone();
            next.event_list_state.is_loading = false;
            next
        }));
    }
}

#[derive(Clone)]
pub struct LoginOrCreateAccountDialogState {
    /// アカウント作成で生成した秘密鍵
    pub generated_key: Option<ed25519_dalek::SigningKey>,
    /// アカウント作成のユーザー名
    pub username: String,
    /// アカウント作成の送信結果メッセージ
    pub create_account_result_message: Option<String>,

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

#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Location {
    Home,
    AccountList,
    PartList,
    ModuleList,
    LocalEventQueue,
    Module(definy_event::EventHashId),
    Part(definy_event::EventHashId),
    Event(definy_event::EventHashId),
    Account(AccountId),
}

impl Location {
    pub fn to_url(&self) -> String {
        match self {
            Location::Home => "/".to_string(),
            Location::AccountList => "/accounts".to_string(),
            Location::PartList => "/parts".to_string(),
            Location::ModuleList => "/modules".to_string(),
            Location::LocalEventQueue => "/local-events".to_string(),
            Location::Module(hash) => format!("/modules/{}", hash),
            Location::Part(hash) => format!("/parts/{}", hash),
            Location::Event(hash) => format!("/events/{}", hash),
            Location::Account(account_id) => format!("/accounts/{}", account_id),
        }
    }

    pub fn from_url(url: &str) -> Option<Self> {
        let parts: Vec<&str> = url.trim_matches('/').split('/').collect();
        match parts.as_slice() {
            [""] => Some(Location::Home),
            ["accounts"] => Some(Location::AccountList),
            ["parts"] => Some(Location::PartList),
            ["modules"] => Some(Location::ModuleList),
            ["local-events"] => Some(Location::LocalEventQueue),
            ["modules", hash_str] => Some(Location::Module(EventHashId::from_str(hash_str).ok()?)),
            ["parts", hash_str] => Some(Location::Part(EventHashId::from_str(hash_str).ok()?)),
            ["events", hash_str] => Some(Location::Event(EventHashId::from_str(hash_str).ok()?)),
            ["accounts", account_id_str] => {
                Some(Location::Account(AccountId::from_str(account_id_str).ok()?))
            }
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use definy_event::{EventHashId, event::AccountId};

    use super::Location;

    #[test]
    fn route_round_trip_cases() {
        let cases = vec![
            Location::Home,
            Location::AccountList,
            Location::PartList,
            Location::ModuleList,
            Location::Module(
                EventHashId::from_str("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                    .ok()
                    .unwrap(),
            ),
            Location::Account(
                AccountId::from_str("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                    .ok()
                    .unwrap(),
            ),
            Location::Part(
                EventHashId::from_str("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                    .ok()
                    .unwrap(),
            ),
            Location::Event(
                EventHashId::from_str("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                    .ok()
                    .unwrap(),
            ),
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
