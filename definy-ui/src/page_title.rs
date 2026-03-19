use definy_event::EventHashId;

use crate::i18n;
use crate::{AppState, Location};

#[derive(Clone, Copy)]
enum RouteId {
    Home,
    AccountList,
    PartList,
    ModuleList,
    LocalEventQueue,
    AccountDetail,
    PartDetail,
    ModuleDetail,
    EventDetail,
    NotFound,
}

impl RouteId {
    fn from_location(location: &Option<Location>) -> Self {
        match location {
            Some(Location::Home) => Self::Home,
            Some(Location::AccountList) => Self::AccountList,
            Some(Location::PartList) => Self::PartList,
            Some(Location::ModuleList) => Self::ModuleList,
            Some(Location::LocalEventQueue) => Self::LocalEventQueue,
            Some(Location::Account(_)) => Self::AccountDetail,
            Some(Location::Part(_)) => Self::PartDetail,
            Some(Location::Module(_)) => Self::ModuleDetail,
            Some(Location::Event(_)) => Self::EventDetail,
            None => Self::NotFound,
        }
    }

    fn title_prefix(self, state: &AppState) -> &'static str {
        match self {
            Self::Home => i18n::tr(state, "home", "ホーム", "hejmo"),
            Self::AccountList | Self::AccountDetail => {
                i18n::tr(state, "accounts", "アカウント", "kontoj")
            }
            Self::PartList | Self::PartDetail => i18n::tr(state, "parts", "パーツ", "partoj"),
            Self::ModuleList | Self::ModuleDetail => {
                i18n::tr(state, "modules", "モジュール", "moduloj")
            }
            Self::LocalEventQueue => {
                i18n::tr(state, "local-events", "ローカルイベント", "lokaj-eventoj")
            }
            Self::EventDetail => i18n::tr(state, "events", "イベント", "eventoj"),
            Self::NotFound => i18n::tr(state, "not-found", "未検出", "ne-trovita"),
        }
    }
}

pub fn page_title_text(state: &AppState) -> String {
    let route_id = RouteId::from_location(&state.location);
    match &state.location {
        Some(Location::Home)
        | Some(Location::AccountList)
        | Some(Location::PartList)
        | Some(Location::ModuleList)
        | Some(Location::LocalEventQueue)
        | None => route_id.title_prefix(state).to_string(),
        Some(Location::Account(account_id)) => {
            let account_name =
                crate::app_state::account_display_name(&state.account_name_map(), account_id);
            format!("{}/{}", route_id.title_prefix(state), account_name)
        }
        Some(Location::Part(definition_event_hash)) => {
            let part_name = resolve_part_name(state, definition_event_hash)
                .unwrap_or_else(|| definition_event_hash.to_string());
            format!("{}/{}", route_id.title_prefix(state), part_name)
        }
        Some(Location::Module(definition_event_hash)) => {
            let module_name =
                crate::module_projection::resolve_module_name(state, definition_event_hash)
                    .unwrap_or_else(|| definition_event_hash.to_string());
            format!("{}/{}", route_id.title_prefix(state), module_name)
        }
        Some(Location::Event(event_hash)) => {
            let event_label = state
                .event_cache
                .iter()
                .find_map(|(hash, event_result)| {
                    if hash != event_hash {
                        return None;
                    }
                    let (_, event) = event_result.as_ref().ok()?;
                    let label = match &event.content {
                        definy_event::event::EventContent::CreateAccount(_) => {
                            i18n::tr(state, "create-account", "アカウント作成", "konto-kreo")
                                .to_string()
                        }
                        definy_event::event::EventContent::ChangeProfile(_) => {
                            i18n::tr(state, "change-profile", "プロフィール変更", "profil-ŝanĝo")
                                .to_string()
                        }
                        definy_event::event::EventContent::PartDefinition(part_definition) => {
                            format!(
                                "{}/{}",
                                i18n::tr(state, "part-definition", "パーツ定義", "parto-difino"),
                                part_definition.part_name
                            )
                        }
                        definy_event::event::EventContent::PartUpdate(part_update) => {
                            format!(
                                "{}/{}",
                                i18n::tr(state, "part-update", "パーツ更新", "parto-ĝisdatigo"),
                                part_update.part_name
                            )
                        }
                        definy_event::event::EventContent::ModuleDefinition(module_definition) => {
                            format!(
                                "{}/{}",
                                i18n::tr(
                                    state,
                                    "module-definition",
                                    "モジュール定義",
                                    "modulo-difino"
                                ),
                                module_definition.module_name
                            )
                        }
                        definy_event::event::EventContent::ModuleUpdate(module_update) => {
                            format!(
                                "{}/{}",
                                i18n::tr(
                                    state,
                                    "module-update",
                                    "モジュール更新",
                                    "modulo-ĝisdatigo"
                                ),
                                module_update.module_name
                            )
                        }
                    };
                    Some(label)
                })
                .unwrap_or_else(|| event_hash.to_string());
            format!("{}/{}", route_id.title_prefix(state), event_label)
        }
    }
}

pub fn document_title_text(state: &AppState) -> String {
    format!("{} | definy", page_title_text(state))
}

fn resolve_part_name(state: &AppState, definition_event_hash: &EventHashId) -> Option<String> {
    let mut events = state
        .event_cache
        .iter()
        .filter_map(|(hash, event_result)| {
            let (_, event) = event_result.as_ref().ok()?;
            Some((hash.clone(), event))
        })
        .collect::<Vec<(EventHashId, &definy_event::event::Event)>>();
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
