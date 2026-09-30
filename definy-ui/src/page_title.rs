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
    ApiOverview,
    ApiMethod(crate::app_state::ApiMethod),
    ApiArchitecture,
    About,
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
            Some(Location::About) => Self::About,
            Some(Location::ApiOverview) => Self::ApiOverview,
            Some(Location::ApiArchitecture) => Self::ApiArchitecture,
            Some(Location::ApiMethod(method, _)) => Self::ApiMethod(*method),
            Some(Location::Account(_)) => Self::AccountDetail,
            Some(Location::Part(_)) => Self::PartDetail,
            Some(Location::Module(_)) => Self::ModuleDetail,
            Some(Location::Event(_)) => Self::EventDetail,
            None => Self::NotFound,
        }
    }

    fn title_prefix(self, context: &PageContext) -> String {
        match self {
            Self::Home => context
                .language
                .label("Home", "ホーム", "Hejmo")
                .to_string(),
            Self::About => context
                .language
                .label("About definy", "definy について", "Pri definy")
                .to_string(),
            Self::AccountList | Self::AccountDetail => context
                .language
                .label("Accounts", "アカウント", "Kontoj")
                .to_string(),
            Self::PartList | Self::PartDetail => context
                .language
                .label("Parts", "パーツ", "Partoj")
                .to_string(),
            Self::ModuleList | Self::ModuleDetail => context
                .language
                .label("Modules", "モジュール", "Moduloj")
                .to_string(),
            Self::Settings => context
                .language
                .label("Settings", "設定", "Agordoj")
                .to_string(),
            Self::ApiOverview => context
                .language
                .label(
                    "Connect-RPC Specification",
                    "Connect-RPC API 仕様",
                    "Connect-RPC Specifigo",
                )
                .to_string(),
            Self::ApiArchitecture => context
                .language
                .label(
                    "RPC & CAS Sequence Diagrams",
                    "RPC & CAS シーケンス図",
                    "RPC & CAS Sekvencaj Diagramoj",
                )
                .to_string(),
            Self::ApiMethod(method) => format!("RPC: {}", method.name()),
            Self::LocalEventQueue => context
                .language
                .label("Local Events", "ローカルイベント", "Lokaj eventoj")
                .to_string(),
            Self::TreeLayout => context
                .language
                .label("Tree Layout", "木構造レイアウト", "Arba aranĝo")
                .to_string(),
            Self::EventDetail => context
                .language
                .label("Events", "イベント", "Eventoj")
                .to_string(),
            Self::NotFound => context
                .language
                .label("Not Found", "未検出", "Ne trovita")
                .to_string(),
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
        | Some(Location::About)
        | Some(Location::ApiOverview)
        | Some(Location::ApiArchitecture)
        | Some(Location::ApiMethod(_, _))
        | None => route_id.title_prefix(context),
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

pub fn document_description_text(state: &AppState, context: &PageContext) -> String {
    match &context.location {
        Some(Location::Home) => context
            .language
            .label(
                "definy is a content-addressed, self-hosted purely functional programming language and collaborative platform.",
                "definy はコンテンツ指向・自己記述型の純粋関数型プログラミング言語・協調開発プラットフォームです。",
                "definy estas enhav-adresebla, memgastiga pure funkcia programlingvo kaj kunlabora platformo.",
            )
            .to_string(),
        Some(Location::About) => context
            .language
            .label(
                "Learn about definy, its content-addressed architecture, purely functional AST, and self-hosting vision.",
                "definy の思想、コンテンツ指向アーキテクチャ、純粋関数型 AST、自己記述のロードマップについて紹介します。",
                "Lernu pri definy, ĝia enhav-adresebla arkitekturo, pure funkcia AST kaj memgastiga vizio.",
            )
            .to_string(),
        Some(Location::Part(definition_event_hash)) => {
            let part_name = resolve_part_name(state, definition_event_hash)
                .unwrap_or_else(|| definition_event_hash.to_string());
            format!("Part '{}' on definy", part_name)
        }
        Some(Location::Module(definition_event_hash)) => {
            let module_name =
                crate::module_projection::resolve_module_name(state, definition_event_hash)
                    .unwrap_or_else(|| definition_event_hash.to_string());
            format!("Module '{}' on definy", module_name)
        }
        _ => page_title_text(state, context),
    }
}

fn resolve_part_name(state: &AppState, definition_event_hash: &EventHashId) -> Option<String> {
    crate::part_projection::find_part_snapshot(state, definition_event_hash).map(|p| p.part_name)
}
