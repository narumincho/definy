use definy_event::EventHashId;

use crate::page_context::PageContext;
use crate::{AppState, Location};

#[derive(Clone, Copy)]
enum RouteId {
    Home,
    AccountList,
    PartList,
    ModuleList,
    LocalEventQueue,
    TreeLayout,
    Settings,
    AccountDetail,
    PartDetail,
    ModuleDetail,
    EventDetail,
    ApiExplorer,
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
            Some(Location::TreeLayout) => Self::TreeLayout,
            Some(Location::Settings) => Self::Settings,
            Some(Location::ApiExplorer(_)) => Self::ApiExplorer,
            Some(Location::Account(_)) => Self::AccountDetail,
            Some(Location::Part(_)) => Self::PartDetail,
            Some(Location::Module(_)) => Self::ModuleDetail,
            Some(Location::Event(_)) => Self::EventDetail,
            None => Self::NotFound,
        }
    }

    fn title_prefix(self, context: &PageContext) -> &'static str {
        match self {
            Self::Home => context.language.label("Home", "ホーム", "Hejmo"),
            Self::AccountList | Self::AccountDetail => {
                context.language.label("Accounts", "アカウント", "Kontoj")
            }
            Self::PartList | Self::PartDetail => {
                context.language.label("Parts", "パーツ", "Partoj")
            }
            Self::ModuleList | Self::ModuleDetail => {
                context.language.label("Modules", "モジュール", "Moduloj")
            }
            Self::Settings => context.language.label("Settings", "設定", "Agordoj"),
            Self::ApiExplorer => context.language.label(
                "Connect-RPC Explorer",
                "Connect-RPC エクスプローラー",
                "Connect-RPC Esplorilo",
            ),
            Self::LocalEventQueue => {
                context
                    .language
                    .label("Local Events", "ローカルイベント", "Lokaj eventoj")
            }
            Self::TreeLayout => {
                context
                    .language
                    .label("Tree Layout", "木構造レイアウト", "Arba aranĝo")
            }
            Self::EventDetail => context.language.label("Events", "イベント", "Eventoj"),
            Self::NotFound => context.language.label("Not Found", "未検出", "Ne trovita"),
        }
    }
}

pub fn page_title_text(state: &AppState, context: &PageContext) -> String {
    let route_id = RouteId::from_location(&context.location);
    match &context.location {
        Some(Location::Home)
        | Some(Location::AccountList)
        | Some(Location::PartList)
        | Some(Location::ModuleList)
        | Some(Location::LocalEventQueue)
        | Some(Location::TreeLayout)
        | Some(Location::Settings)
        | Some(Location::ApiExplorer(_))
        | None => route_id.title_prefix(context).to_string(),
        Some(Location::Account(account_id)) => {
            let account_name =
                crate::app_state::account_display_name(&state.account_name_map(), account_id);
            format!("{}/{}", route_id.title_prefix(context), account_name)
        }
        Some(Location::Part(definition_event_hash)) => {
            let part_name = resolve_part_name(state, definition_event_hash)
                .unwrap_or_else(|| definition_event_hash.to_string());
            format!("{}/{}", route_id.title_prefix(context), part_name)
        }
        Some(Location::Module(definition_event_hash)) => {
            let module_name =
                crate::module_projection::resolve_module_name(state, definition_event_hash)
                    .unwrap_or_else(|| definition_event_hash.to_string());
            format!("{}/{}", route_id.title_prefix(context), module_name)
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
                        definy_event::event::EventContent::CreateAccount(_) => context
                            .language
                            .label("create-account", "アカウント作成", "konto-kreo")
                            .to_string(),
                        definy_event::event::EventContent::ChangeProfile(_) => context
                            .language
                            .label("change-profile", "プロフィール変更", "profil-ŝanĝo")
                            .to_string(),
                        definy_event::event::EventContent::ModuleCommit(module_commit) => {
                            format!(
                                "{}/{}: {}",
                                context.language.label(
                                    "module-commit",
                                    "モジュールコミット",
                                    "modulo-enmeto"
                                ),
                                module_commit.module_name,
                                module_commit.message
                            )
                        }
                    };
                    Some(label)
                })
                .unwrap_or_else(|| event_hash.to_string());
            format!("{}/{}", route_id.title_prefix(context), event_label)
        }
    }
}

pub fn document_title_text(state: &AppState, context: &PageContext) -> String {
    format!("{} | definy", page_title_text(state, context))
}

fn resolve_part_name(state: &AppState, definition_event_hash: &EventHashId) -> Option<String> {
    crate::part_projection::find_part_snapshot(state, definition_event_hash).map(|p| p.part_name)
}
