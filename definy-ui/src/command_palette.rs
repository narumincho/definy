//! コマンドパレット (Cmd/Ctrl+P または Cmd/Ctrl+K, タイトルバー中央のクリックで開く).
//! パーツ・モジュール・各ページを名前で探して開く

use dioxus::prelude::*;

use crate::icon::{Icon, IconKind};
use crate::module_projection::collect_module_snapshots;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;
use crate::{AppState, Location};

/// コマンドパレットの開閉状態
#[derive(Clone, Copy)]
pub struct CommandPaletteOpen(pub Signal<bool>);

/// 1 件の候補
#[derive(Clone, Debug, PartialEq)]
pub struct PaletteItem {
    /// 検索の対象になる名前 (例: `sample.greet`)
    pub label: String,
    /// 右側に薄く出す補足 (型やページの種類)
    pub detail: String,
    pub href: String,
    pub icon: IconKind,
}

/// 表示する候補の上限
const MAX_RESULTS: usize = 60;

/// `query` に一致する候補の添字を, よく一致する順に返す.
///
/// 名前全体の一致 > 先頭一致 > 区切り (`.` `-` `_` 空白) の直後からの一致 > 途中の一致 > 文字の順の一致 (あいまい).
/// 同じ順位なら短い名前, 元の並び順を優先する. 空のときは元の並び順
pub fn rank_items(items: &[PaletteItem], query: &str) -> Vec<usize> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return (0..items.len()).take(MAX_RESULTS).collect();
    }
    let mut scored: Vec<(u8, usize, usize)> = items
        .iter()
        .enumerate()
        .filter_map(|(index, item)| {
            let label = item.label.to_lowercase();
            match_score(&label, &query).map(|score| (score, label.chars().count(), index))
        })
        .collect();
    scored.sort();
    scored
        .into_iter()
        .take(MAX_RESULTS)
        .map(|(_, _, index)| index)
        .collect()
}

fn match_score(label: &str, query: &str) -> Option<u8> {
    // `module.part` の part 部分だけで比べた一致も先頭一致として扱う
    let last_segment = label.rsplit('.').next().unwrap_or(label);
    if label == query || last_segment == query {
        return Some(0);
    }
    if label.starts_with(query) || last_segment.starts_with(query) {
        return Some(1);
    }
    if let Some(position) = label.find(query) {
        let after_separator = label[..position]
            .chars()
            .last()
            .is_some_and(|c| matches!(c, '.' | '-' | '_' | ' ' | '/'));
        return Some(if after_separator { 2 } else { 3 });
    }
    let mut label_chars = label.chars();
    query
        .chars()
        .all(|q| label_chars.any(|c| c == q))
        .then_some(4)
}

/// ページ・モジュール・パーツの候補を集める
fn collect_items(state: &AppState, context: &PageContext) -> Vec<PaletteItem> {
    let language = context.language;
    let page_detail = language.label("Page", "ページ", "Paĝo");
    let pages = [
        (
            language.label("Events", "イベント", "Eventoj"),
            Location::Home,
            IconKind::Events,
        ),
        (
            language.label("Parts", "パーツ一覧", "Partoj"),
            Location::PartList,
            IconKind::Parts,
        ),
        (
            language.label("Modules", "モジュール一覧", "Moduloj"),
            Location::ModuleList,
            IconKind::Modules,
        ),
        (
            language.label("Accounts", "アカウント一覧", "Kontoj"),
            Location::AccountList,
            IconKind::Accounts,
        ),
        (
            language.label("Deploy", "デプロイ", "Deplojo"),
            Location::Deployments,
            IconKind::Deploy,
        ),
        (
            language.label("Local events", "ローカルイベント", "Lokaj eventoj"),
            Location::LocalEventQueue,
            IconKind::Events,
        ),
        (
            language.label("Tree layout", "木構造レイアウト", "Arba aranĝo"),
            Location::TreeLayout,
            IconKind::Parts,
        ),
        (
            language.label("API overview", "API 概要", "API superrigardo"),
            Location::ApiOverview,
            IconKind::Deploy,
        ),
        (
            language.label("Settings", "設定", "Agordoj"),
            Location::Settings,
            IconKind::Settings,
        ),
        (
            language.label("About definy", "definy について", "Pri definy"),
            Location::About,
            IconKind::About,
        ),
    ];

    let mut items: Vec<PaletteItem> = pages
        .into_iter()
        .map(|(label, location, icon)| PaletteItem {
            label: label.to_string(),
            detail: page_detail.to_string(),
            href: context.href_with_lang(location),
            icon,
        })
        .collect();

    let mut modules = collect_module_snapshots(state);
    modules.sort_by(|a, b| a.module_name.cmp(&b.module_name));
    let module_detail = language.label("Module", "モジュール", "Modulo");
    items.extend(modules.iter().map(|module| PaletteItem {
        label: module.module_name.clone(),
        detail: module_detail.to_string(),
        href: context.href_with_lang(Location::Module(module.definition_event_hash.clone())),
        icon: IconKind::Module,
    }));

    let module_names: std::collections::HashMap<_, _> = modules
        .iter()
        .map(|module| (&module.definition_event_hash, module.module_name.as_str()))
        .collect();
    let mut parts = collect_part_snapshots(state);
    parts.sort_by(|a, b| a.part_name.cmp(&b.part_name));
    items.extend(parts.iter().map(|part| {
        let module_name = module_names
            .get(&part.module_definition_event_hash)
            .copied()
            .unwrap_or("?");
        PaletteItem {
            label: format!("{module_name}.{}", part.part_name),
            detail: part
                .part_type
                .as_ref()
                .map(|t| t.to_string())
                .unwrap_or_default(),
            href: context.href_with_lang(Location::Part(part.definition_event_hash.clone())),
            icon: IconKind::Part,
        }
    }));
    items
}

#[component]
pub fn CommandPalette(state: AppState, context: PageContext) -> Element {
    let CommandPaletteOpen(open) = use_context::<CommandPaletteOpen>();
    use_global_shortcut(open);

    if !open() {
        return rsx! {};
    }
    rsx! {
        CommandPalettePanel { state, context }
    }
}

#[component]
fn CommandPalettePanel(state: AppState, context: PageContext) -> Element {
    let CommandPaletteOpen(mut open) = use_context::<CommandPaletteOpen>();
    let mut query = use_signal(String::new);
    let mut highlighted = use_signal(|| 0usize);

    let items = collect_items(&state, &context);
    let ranked = rank_items(&items, &query());
    let result_count = ranked.len();
    let current = highlighted().min(result_count.saturating_sub(1));

    let placeholder = context.language.label(
        "Search parts, modules and pages",
        "パーツ・モジュール・ページを検索",
        "Serĉi partojn, modulojn kaj paĝojn",
    );

    rsx! {
        div {
            class: "command-palette-backdrop",
            onclick: move |_| open.set(false),
        }
        div {
            class: "command-palette",
            role: "dialog",
            "aria-label": "{placeholder}",
            div { class: "command-palette-input",
                crate::icon::SearchIcon { class: "command-palette-search-icon" }
                input {
                    r#type: "text",
                    role: "combobox",
                    "aria-expanded": "true",
                    "aria-controls": "command-palette-results",
                    "aria-activedescendant": "command-palette-item-{current}",
                    placeholder: "{placeholder}",
                    value: "{query}",
                    onmounted: move |evt: MountedEvent| async move {
                        let _ = evt.set_focus(true).await;
                    },
                    oninput: move |evt: FormEvent| {
                        query.set(evt.value());
                        highlighted.set(0);
                    },
                    onkeydown: move |evt: KeyboardEvent| match evt.key() {
                        Key::ArrowDown => {
                            evt.prevent_default();
                            if result_count > 0 {
                                highlighted.set((current + 1) % result_count);
                                scroll_item_into_view((current + 1) % result_count);
                            }
                        }
                        Key::ArrowUp => {
                            evt.prevent_default();
                            if result_count > 0 {
                                let previous = (current + result_count - 1) % result_count;
                                highlighted.set(previous);
                                scroll_item_into_view(previous);
                            }
                        }
                        Key::Enter => {
                            evt.prevent_default();
                            if result_count > 0 {
                                // 通常のリンクのクリックとして画面遷移させる (クライアント側のルーティングを通す)
                                click_item(current);
                                open.set(false);
                            }
                        }
                        Key::Escape => {
                            evt.prevent_default();
                            open.set(false);
                        }
                        _ => {}
                    },
                }
            }
            div {
                id: "command-palette-results",
                class: "command-palette-results",
                role: "listbox",
                if result_count == 0 {
                    div { class: "command-palette-empty",
                        "{context.language.label(\"No results\", \"見つかりません\", \"Neniuj rezultoj\")}"
                    }
                }
                for (position, index) in ranked.into_iter().enumerate() {
                    {
                        let item = &items[index];
                        rsx! {
                            a {
                                key: "{item.href}",
                                id: "command-palette-item-{position}",
                                class: "command-palette-item",
                                role: "option",
                                "aria-selected": if position == current { "true" } else { "false" },
                                href: "{item.href}",
                                onmouseenter: move |_| highlighted.set(position),
                                onclick: move |_| open.set(false),
                                Icon { kind: item.icon, class: "command-palette-item-icon" }
                                span { class: "command-palette-item-label", "{item.label}" }
                                span { class: "command-palette-item-detail", "{item.detail}" }
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg(target_arch = "wasm32")]
fn item_element(position: usize) -> Option<web_sys::HtmlElement> {
    use wasm_bindgen::JsCast;
    web_sys::window()?
        .document()?
        .get_element_by_id(&format!("command-palette-item-{position}"))?
        .dyn_into::<web_sys::HtmlElement>()
        .ok()
}

/// イベント処理の後でクリックする (ハンドラ内で同期的に click すると Dioxus のイベント処理が入れ子になるため)
fn click_item(position: usize) {
    crate::dom::click_first(&format!("#command-palette-item-{position}"));
}

#[cfg(target_arch = "wasm32")]
fn scroll_item_into_view(position: usize) {
    if let Some(element) = item_element(position) {
        let options = web_sys::ScrollIntoViewOptions::new();
        options.set_block(web_sys::ScrollLogicalPosition::Nearest);
        element.scroll_into_view_with_scroll_into_view_options(&options);
    }
}

#[cfg(not(target_arch = "wasm32"))]
fn scroll_item_into_view(_position: usize) {}

/// Cmd/Ctrl+P と Cmd/Ctrl+K でどこからでも開けるようにする
#[cfg(target_arch = "wasm32")]
fn use_global_shortcut(open: Signal<bool>) {
    use wasm_bindgen::JsCast;
    use_hook(move || {
        let mut open = open;
        let listener = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::KeyboardEvent)>::new(
            move |event: web_sys::KeyboardEvent| {
                let key = event.key().to_lowercase();
                if (event.meta_key() || event.ctrl_key())
                    && !event.alt_key()
                    && !event.shift_key()
                    && (key == "p" || key == "k")
                {
                    // ブラウザの印刷ダイアログなどを開かない
                    event.prevent_default();
                    let current = *open.peek();
                    open.set(!current);
                }
            },
        );
        if let Some(window) = web_sys::window() {
            let _ = window
                .add_event_listener_with_callback("keydown", listener.as_ref().unchecked_ref());
        }
        // アプリと同じ寿命なので解除しない
        listener.forget();
    });
}

#[cfg(not(target_arch = "wasm32"))]
fn use_global_shortcut(_open: Signal<bool>) {}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(label: &str) -> PaletteItem {
        PaletteItem {
            label: label.to_string(),
            detail: String::new(),
            href: format!("/{label}"),
            icon: IconKind::Part,
        }
    }

    fn labels(items: &[PaletteItem], query: &str) -> Vec<String> {
        rank_items(items, query)
            .into_iter()
            .map(|index| items[index].label.clone())
            .collect()
    }

    #[test]
    fn exact_and_prefix_matches_come_first() {
        let items = vec![
            item("core.type-env-lookup"),
            item("core.env-lookup-inner"),
            item("core.env-lookup"),
            item("sample.greet"),
        ];
        assert_eq!(
            labels(&items, "env-lookup"),
            vec![
                "core.env-lookup",
                "core.env-lookup-inner",
                "core.type-env-lookup"
            ]
        );
    }

    #[test]
    fn matches_module_qualified_names_and_is_case_insensitive() {
        let items = vec![item("sample.greet"), item("core.greeting")];
        assert_eq!(labels(&items, "Sample.G"), vec!["sample.greet"]);
    }

    #[test]
    fn fuzzy_subsequence_matches_last() {
        let items = vec![item("core.type-check"), item("core.tc"), item("std.text")];
        assert_eq!(labels(&items, "tc"), vec!["core.tc", "core.type-check"]);
    }

    #[test]
    fn empty_query_keeps_order() {
        let items = vec![item("b"), item("a")];
        assert_eq!(labels(&items, "  "), vec!["b", "a"]);
    }
}
