//! IDE 風のワークベンチ (タイトルバー / アクティビティバー / エクスプローラー / エディタ領域 / ステータスバー)

use dioxus::prelude::*;

use crate::icon::{Icon, IconKind};
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;
use crate::{AppState, Location};

/// サイドバー (エクスプローラー) の開閉状態.
///
/// 幅の広い画面では既定で表示し `true` で隠す. 狭い画面では既定で隠し `true` でドロワーとして表示する
#[derive(Clone, Copy)]
pub struct SidebarToggle(pub Signal<bool>);

#[component]
pub fn Workbench(state: AppState, context: PageContext, children: Element) -> Element {
    let sidebar_toggled = use_signal(|| false);
    use_context_provider(|| SidebarToggle(sidebar_toggled));

    let workbench_class = if sidebar_toggled() {
        "workbench sidebar-toggled"
    } else {
        "workbench"
    };

    rsx! {
        div { class: "{workbench_class}",
            crate::header::HeaderView { state: state.clone(), context: context.clone() }
            ActivityBar { state: state.clone(), context: context.clone() }
            ExplorerSidebar { state: state.clone(), context: context.clone() }
            // 狭い画面でドロワー表示中に背景をタップして閉じる
            div {
                class: "sidebar-scrim",
                onclick: move |_| {
                    let SidebarToggle(mut toggled) = use_context::<SidebarToggle>();
                    toggled.set(false);
                },
            }
            main { class: "workbench-editor",
                EditorTabBar { state: state.clone(), context: context.clone() }
                div { class: "workbench-editor-scroll", {children} }
            }
            crate::header::StatusBarView { state: state.clone(), context: context.clone() }
        }
    }
}

#[derive(Clone, Copy, PartialEq)]
enum ActivityTarget {
    Events,
    Parts,
    Modules,
    Accounts,
    Deploy,
    About,
    Settings,
}

impl ActivityTarget {
    fn location(self) -> Location {
        match self {
            Self::Events => Location::Home,
            Self::Parts => Location::PartList,
            Self::Modules => Location::ModuleList,
            Self::Accounts => Location::AccountList,
            Self::Deploy => Location::Deployments,
            Self::About => Location::About,
            Self::Settings => Location::Settings,
        }
    }

    fn icon(self) -> IconKind {
        match self {
            Self::Events => IconKind::Events,
            Self::Parts => IconKind::Parts,
            Self::Modules => IconKind::Modules,
            Self::Accounts => IconKind::Accounts,
            Self::Deploy => IconKind::Deploy,
            Self::About => IconKind::About,
            Self::Settings => IconKind::Settings,
        }
    }

    fn label(self, context: &PageContext) -> &'static str {
        match self {
            Self::Events => context.language.label("Events", "イベント", "Eventoj"),
            Self::Parts => context.language.label("Parts", "パーツ", "Partoj"),
            Self::Modules => context.language.label("Modules", "モジュール", "Moduloj"),
            Self::Accounts => context.language.label("Accounts", "アカウント", "Kontoj"),
            Self::Deploy => context.language.label("Deploy", "デプロイ", "Deplojo"),
            Self::About => context.language.label("About", "About", "Pri"),
            Self::Settings => context.language.label("Settings", "設定", "Agordoj"),
        }
    }

    fn is_active(self, location: &Option<Location>) -> bool {
        matches!(
            (self, location),
            (Self::Events, Some(Location::Home | Location::Event(_)))
                | (Self::Parts, Some(Location::PartList | Location::Part(_)))
                | (
                    Self::Modules,
                    Some(Location::ModuleList | Location::Module(_))
                )
                | (
                    Self::Accounts,
                    Some(Location::AccountList | Location::Account(_))
                )
                | (
                    Self::Deploy,
                    Some(
                        Location::Deployments
                            | Location::ApiOverview
                            | Location::ApiArchitecture
                            | Location::ApiMethod(_, _)
                    )
                )
                | (Self::About, Some(Location::About))
                | (
                    Self::Settings,
                    Some(Location::Settings | Location::TreeLayout | Location::LocalEventQueue)
                )
        )
    }
}

#[component]
fn ActivityBar(state: AppState, context: PageContext) -> Element {
    let pending_count = state
        .local_event_queue
        .items
        .iter()
        .filter(|i| {
            matches!(
                i.status,
                crate::local_event::LocalEventStatus::Queued
                    | crate::local_event::LocalEventStatus::Failed
            )
        })
        .count();

    rsx! {
        nav {
            class: "activity-bar",
            "aria-label": "{context.language.label(\"Main navigation\", \"メインナビゲーション\", \"Ĉefa navigado\")}",
            for target in [
                ActivityTarget::Events,
                ActivityTarget::Parts,
                ActivityTarget::Modules,
                ActivityTarget::Accounts,
                ActivityTarget::Deploy,
            ]
            {
                ActivityItem {
                    key: "{target.label(&context)}",
                    context: context.clone(),
                    target,
                    badge: 0,
                }
            }
            div { class: "activity-bar-spacer" }
            ActivityItem {
                context: context.clone(),
                target: ActivityTarget::About,
                badge: 0,
            }
            ActivityItem {
                context: context.clone(),
                target: ActivityTarget::Settings,
                badge: pending_count,
            }
        }
    }
}

#[component]
fn ActivityItem(context: PageContext, target: ActivityTarget, badge: usize) -> Element {
    let is_active = target.is_active(&context.location);
    let label = target.label(&context);
    rsx! {
        a {
            class: if is_active { "activity-item active" } else { "activity-item" },
            href: context.href_with_lang(target.location()),
            title: "{label}",
            "aria-current": if is_active { "page" } else { "false" },
            Icon { kind: target.icon(), class: "activity-icon" }
            span { class: "activity-label", "{label}" }
            if badge > 0 {
                span { class: "activity-badge", "{badge}" }
            }
        }
    }
}

/// モジュール → パーツの木構造を表示するエクスプローラー
#[component]
fn ExplorerSidebar(state: AppState, context: PageContext) -> Element {
    let mut modules = collect_module_snapshots(&state);
    modules.sort_by(|a, b| a.module_name.cmp(&b.module_name));
    let mut parts = collect_part_snapshots(&state);
    parts.sort_by(|a, b| a.part_name.cmp(&b.part_name));

    let active_part = match &context.location {
        Some(Location::Part(hash)) => Some(hash.clone()),
        _ => None,
    };
    let active_module = match &context.location {
        Some(Location::Module(hash)) => Some(hash.clone()),
        Some(Location::Part(hash)) => parts
            .iter()
            .find(|part| &part.definition_event_hash == hash)
            .map(|part| part.module_definition_event_hash.clone()),
        _ => None,
    };

    // 狭い画面のドロワーをリンク選択時に閉じる.
    // 幅の広い画面ではサイドバーが見えている時点で false なので何も変わらない
    let close_drawer = move |_: MouseEvent| {
        let SidebarToggle(mut toggled) = use_context::<SidebarToggle>();
        toggled.set(false);
    };

    let tree = modules.iter().map(|module| {
        let module_parts: Vec<_> = parts
            .iter()
            .filter(|part| part.module_definition_event_hash == module.definition_event_hash)
            .collect();
        let is_module_active = active_module.as_ref() == Some(&module.definition_event_hash)
            && active_part.is_none();
        let contains_active = active_module.as_ref() == Some(&module.definition_event_hash);
        let module_href = context.href_with_lang(Location::Module(module.definition_event_hash.clone()));
        let part_count = module_parts.len();
        rsx! {
            details {
                key: "{module.definition_event_hash}",
                class: "tree-group",
                open: contains_active || modules.len() <= 3,
                summary { class: if is_module_active { "tree-row active" } else { "tree-row" },
                    Icon { kind: IconKind::ChevronRight, class: "tree-chevron" }
                    Icon {
                        kind: IconKind::Module,
                        class: "tree-icon tree-icon-module",
                    }
                    a {
                        class: "tree-label",
                        href: "{module_href}",
                        onclick: close_drawer,
                        "{module.module_name}"
                    }
                    span { class: "tree-count", "{part_count}" }
                }
                div { class: "tree-children",
                    for part in module_parts {
                        {
                            let is_active = active_part.as_ref() == Some(&part.definition_event_hash);
                            let type_text = part
                                .part_type
                                .as_ref()
                                .map(|t| t.to_string())
                                .unwrap_or_default();
                            rsx! {
                                a {
                                    key: "{part.definition_event_hash}",
                                    class: if is_active { "tree-row tree-leaf active" } else { "tree-row tree-leaf" },
                                    href: context.href_with_lang(Location::Part(part.definition_event_hash.clone())),
                                    title: "{module.module_name}.{part.part_name}",
                                    onclick: close_drawer,
                                    Icon { kind: IconKind::Part, class: "tree-icon tree-icon-part" }
                                    span { class: "tree-label", "{part.part_name}" }
                                    span { class: "tree-type", "{type_text}" }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    rsx! {
        aside { class: "workbench-sidebar",
            div { class: "sidebar-header",
                span {
                    "{context.language.label(\"Explorer\", \"エクスプローラー\", \"Esplorilo\")}"
                }
                a {
                    class: "sidebar-header-action",
                    href: context.href_with_lang(Location::PartList),
                    title: "{context.language.label(\"All parts\", \"パーツ一覧\", \"Ĉiuj partoj\")}",
                    onclick: close_drawer,
                    Icon { kind: IconKind::Parts, class: "sidebar-header-icon" }
                }
            }
            div { class: "sidebar-section-title",
                "{context.language.label(\"Modules\", \"モジュール\", \"Moduloj\")}"
                span { class: "tree-count", "{modules.len()}" }
            }
            div { class: "sidebar-tree",
                if modules.is_empty() {
                    div { class: "sidebar-empty",
                        "{context.language.label(\"No modules loaded yet\", \"モジュールはまだ読み込まれていません\", \"Neniuj moduloj ŝarĝitaj\")}"
                    }
                }
                {tree}
            }
        }
    }
}

/// エディタ領域上部のタブ (現在のページ) とパンくずリスト
#[component]
fn EditorTabBar(state: AppState, context: PageContext) -> Element {
    let title_text = crate::page_title::page_title_text(&state, &context);
    let segments: Vec<String> = title_text.split('/').map(str::to_string).collect();
    let tab_label = segments.last().cloned().unwrap_or_default();
    let icon = [
        ActivityTarget::Events,
        ActivityTarget::Parts,
        ActivityTarget::Modules,
        ActivityTarget::Accounts,
        ActivityTarget::Deploy,
        ActivityTarget::About,
        ActivityTarget::Settings,
    ]
    .into_iter()
    .find(|target| target.is_active(&context.location))
    .map(ActivityTarget::icon)
    .unwrap_or(IconKind::About);
    let segment_count = segments.len();

    rsx! {
        div { class: "editor-tabs",
            div { class: "editor-tab active",
                Icon { kind: icon, class: "editor-tab-icon" }
                span { class: "editor-tab-label", "{tab_label}" }
            }
        }
        div { class: "editor-breadcrumb",
            span { class: "breadcrumb-segment", "definy" }
            for (index, segment) in segments.into_iter().enumerate() {
                span { key: "{index}", class: "breadcrumb-item",
                    Icon {
                        kind: IconKind::ChevronRight,
                        class: "breadcrumb-chevron",
                    }
                    span { class: if index + 1 == segment_count { "breadcrumb-segment current" } else { "breadcrumb-segment" },
                        "{segment}"
                    }
                }
            }
        }
    }
}
