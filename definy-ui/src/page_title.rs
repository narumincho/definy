use crate::{AppState, Location};

#[derive(Clone, Copy)]
enum RouteId {
    Home,
    AccountList,
    PartList,
    AccountDetail,
    PartDetail,
    EventDetail,
    NotFound,
}

impl RouteId {
    fn from_location(location: &Option<Location>) -> Self {
        match location {
            Some(Location::Home) => Self::Home,
            Some(Location::AccountList) => Self::AccountList,
            Some(Location::PartList) => Self::PartList,
            Some(Location::Account(_)) => Self::AccountDetail,
            Some(Location::Part(_)) => Self::PartDetail,
            Some(Location::Event(_)) => Self::EventDetail,
            None => Self::NotFound,
        }
    }

    fn title_prefix(self) -> &'static str {
        match self {
            Self::Home => "home",
            Self::AccountList => "accounts",
            Self::PartList => "parts",
            Self::AccountDetail => "accounts",
            Self::PartDetail => "parts",
            Self::EventDetail => "events",
            Self::NotFound => "not-found",
        }
    }
}

pub fn page_title_text(state: &AppState) -> String {
    let route_id = RouteId::from_location(&state.location);
    match &state.location {
        Some(Location::Home) | Some(Location::AccountList) | Some(Location::PartList) | None => {
            route_id.title_prefix().to_string()
        }
        Some(Location::Account(account_id)) => {
            let account_id = definy_event::event::AccountId(Box::new(*account_id));
            let account_name = state
                .account_name_map()
                .get(&account_id)
                .map(|name| name.to_string())
                .unwrap_or_else(|| "unknown".to_string());
            format!("{}/{}", route_id.title_prefix(), account_name)
        }
        Some(Location::Part(definition_event_hash)) => {
            let part_name = resolve_part_name(state, definition_event_hash)
                .unwrap_or_else(|| short_hash(definition_event_hash));
            format!("{}/{}", route_id.title_prefix(), part_name)
        }
        Some(Location::Event(event_hash)) => {
            let event_label = state
                .created_account_events
                .iter()
                .find_map(|(hash, event_result)| {
                    if hash != event_hash {
                        return None;
                    }
                    let (_, event) = event_result.as_ref().ok()?;
                    let label = match &event.content {
                        definy_event::event::EventContent::CreateAccount(_) => {
                            "create-account".to_string()
                        }
                        definy_event::event::EventContent::ChangeProfile(_) => {
                            "change-profile".to_string()
                        }
                        definy_event::event::EventContent::PartDefinition(part_definition) => {
                            format!("part-definition/{}", part_definition.part_name)
                        }
                        definy_event::event::EventContent::PartUpdate(part_update) => {
                            format!("part-update/{}", part_update.part_name)
                        }
                    };
                    Some(label)
                })
                .unwrap_or_else(|| short_hash(event_hash));
            format!("{}/{}", route_id.title_prefix(), event_label)
        }
    }
}

pub fn document_title_text(state: &AppState) -> String {
    format!("{} | definy", page_title_text(state))
}

fn resolve_part_name(state: &AppState, definition_event_hash: &[u8; 32]) -> Option<String> {
    let mut events = state
        .created_account_events
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((*hash, event))
        })
        .collect::<Vec<([u8; 32], &definy_event::event::Event)>>();
    events.sort_by_key(|(_, event)| event.time);

    let mut name = None::<String>;
    for (hash, event) in events {
        match &event.content {
            definy_event::event::EventContent::PartDefinition(part_definition)
                if &hash == definition_event_hash =>
            {
                name = Some(part_definition.part_name.to_string());
            }
            definy_event::event::EventContent::PartUpdate(part_update)
                if &part_update.part_definition_event_hash == definition_event_hash =>
            {
                if name.is_some() {
                    name = Some(part_update.part_name.to_string());
                }
            }
            _ => {}
        }
    }
    name
}

fn short_hash(hash: &[u8; 32]) -> String {
    crate::hash_format::short_hash32(hash)
}
