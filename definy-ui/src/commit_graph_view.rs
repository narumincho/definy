//! 履歴ページ (`/history`). モジュールのコミットを Git Graph のような枝分かれのグラフで一覧する

use definy_event::EventHashId;
use dioxus::prelude::*;

use crate::Location;
use crate::app_state::AppState;
use crate::commit_graph::{
    GraphRow, PartDiff, Segment, collect_commits, commit_parts, diff_parts, layout,
};
use crate::page_context::PageContext;

const LANE_WIDTH: f64 = 14.0;
const ROW_HEIGHT: f64 = 30.0;
const DOT_RADIUS: f64 = 4.0;

/// レーンの色. main.css の色相トークンを順に使う
fn lane_color(lane: usize) -> &'static str {
    const COLORS: [&str; 7] = [
        "var(--blue)",
        "var(--green)",
        "var(--yellow)",
        "var(--purple)",
        "var(--orange)",
        "var(--pink)",
        "var(--red)",
    ];
    COLORS[lane % COLORS.len()]
}

fn lane_x(lane: usize) -> f64 {
    LANE_WIDTH * lane as f64 + LANE_WIDTH / 2.0
}

/// 1 行分のグラフ. `is_working` は未コミットの変更の行 (点を中抜きにする)
#[component]
fn GraphCell(row: GraphRow, width: usize, is_working: bool) -> Element {
    let svg_width = LANE_WIDTH * width as f64;
    let mid = ROW_HEIGHT / 2.0;
    let x = lane_x(row.column);
    let color = lane_color(row.column);
    rsx! {
        svg {
            class: "commit-graph-svg",
            width: "{svg_width}",
            height: "{ROW_HEIGHT}",
            view_box: "0 0 {svg_width} {ROW_HEIGHT}",
            "aria-hidden": "true",
            for (index, segment) in row.segments.iter().enumerate() {
                {
                    match segment {
                        Segment::Pass(lane) => {
                            let lx = lane_x(*lane);
                            rsx! {
                                line {
                                    key: "{index}",
                                    x1: "{lx}",
                                    y1: "0",
                                    x2: "{lx}",
                                    y2: "{ROW_HEIGHT}",
                                    stroke: lane_color(*lane),
                                    stroke_width: "2",
                                }
                            }
                        }
                        Segment::Into { from } => {
                            let fx = lane_x(*from);
                            // 別のレーンから合流するときは曲線にする
                            let d = if *from == row.column {
                                format!("M {fx} 0 L {x} {mid}")
                            } else {
                                format!("M {fx} 0 C {fx} {mid}, {x} 0, {x} {mid}")
                            };
                            rsx! {
                                path {
                                    key: "{index}",
                                    d: "{d}",
                                    fill: "none",
                                    stroke: lane_color(*from),
                                    stroke_width: "2",
                                    stroke_dasharray: if is_working { "3 3" } else { "none" },
                                }
                            }
                        }
                        Segment::Out => rsx! {
                            line {
                                key: "{index}",
                                x1: "{x}",
                                y1: "{mid}",
                                x2: "{x}",
                                y2: "{ROW_HEIGHT}",
                                stroke: color,
                                stroke_width: "2",
                                stroke_dasharray: if is_working { "3 3" } else { "none" },
                            }
                        },
                    }
                }
            }
            circle {
                cx: "{x}",
                cy: "{mid}",
                r: "{DOT_RADIUS}",
                fill: if is_working { "var(--surface-opaque)" } else { color },
                stroke: color,
                stroke_width: "2",
            }
        }
    }
}

/// 詳細を開いたとき, その下でも続くレーンの線を引く
#[component]
fn GraphContinuation(row: GraphRow, width: usize) -> Element {
    let svg_width = LANE_WIDTH * width as f64;
    let lanes = row
        .segments
        .iter()
        .filter_map(|segment| match segment {
            Segment::Pass(lane) => Some(*lane),
            Segment::Out => Some(row.column),
            Segment::Into { .. } => None,
        })
        .collect::<Vec<_>>();
    rsx! {
        svg {
            class: "commit-graph-svg commit-graph-continuation",
            width: "{svg_width}",
            height: "100%",
            view_box: "0 0 {svg_width} 10",
            preserve_aspect_ratio: "none",
            "aria-hidden": "true",
            for lane in lanes {
                line {
                    key: "{lane}",
                    x1: "{lane_x(lane)}",
                    y1: "0",
                    x2: "{lane_x(lane)}",
                    y2: "10",
                    stroke: lane_color(lane),
                    stroke_width: "2",
                    vector_effect: "non-scaling-stroke",
                }
            }
        }
    }
}

/// グラフの 1 行に並べる項目
#[derive(Clone, PartialEq)]
enum RowItem {
    /// 未コミットの変更 (モジュールごと)
    Working {
        module: EventHashId,
        module_name: String,
        count: usize,
    },
    Commit(Box<crate::commit_graph::CommitNode>),
}

#[component]
pub fn CommitGraphView(state: AppState, context: PageContext) -> Element {
    let language = context.language;
    let page_shell_style = crate::layout::page_shell_style("1.2rem");
    let initial_module = context
        .tab
        .as_deref()
        .and_then(|tab| tab.parse::<EventHashId>().ok());
    let mut module_filter = use_signal(|| initial_module);
    let mut expanded = use_signal(|| None::<EventHashId>);

    let mut modules = crate::module_projection::collect_module_snapshots(&state);
    modules.sort_by(|a, b| a.module_name.cmp(&b.module_name));
    let module_name_of = |hash: &EventHashId| {
        modules
            .iter()
            .find(|module| &module.definition_event_hash == hash)
            .map(|module| module.module_name.clone())
            .unwrap_or_else(|| hash.to_string())
    };
    let filter = module_filter();
    let commits = collect_commits(&state, filter.as_ref());

    // Git Graph と同じく, 未コミットの変更をいちばん上に, モジュールの最新コミットから伸びる枝として出す
    let working_changes = crate::working_changes::WORKING_CHANGES.read().clone();
    let mut items = Vec::<(EventHashId, Option<EventHashId>, RowItem)>::new();
    for module in working_changes.modules() {
        if filter.as_ref().is_some_and(|filter| filter != &module) {
            continue;
        }
        let latest = modules
            .iter()
            .find(|m| m.definition_event_hash == module)
            .map(|m| m.latest_event_hash.clone());
        let mut seed = b"definy:working-changes:".to_vec();
        seed.extend_from_slice(module.as_bytes());
        items.push((
            EventHashId::from_bytes(&seed),
            latest,
            RowItem::Working {
                module: module.clone(),
                module_name: module_name_of(&module),
                count: working_changes.changes_in_module(&module).count(),
            },
        ));
    }
    for commit in commits {
        items.push((
            commit.hash.clone(),
            commit.parent.clone(),
            RowItem::Commit(Box::new(commit)),
        ));
    }
    let rows = layout(
        &items
            .iter()
            .map(|(hash, parent, _)| (hash.clone(), parent.clone()))
            .collect::<Vec<_>>(),
    );
    let width = rows.iter().map(GraphRow::width).max().unwrap_or(1);
    let account_names = state.account_name_map();

    let rendered = items.into_iter().zip(rows).map(|((hash, _, item), row)| {
        let is_expanded = expanded().as_ref() == Some(&hash);
        match item {
            RowItem::Working { module, module_name, count } => rsx! {
                a {
                    key: "{hash}",
                    class: "commit-graph-row",
                    "data-working": "true",
                    href: context.href_with_lang(Location::Changes),
                    GraphCell { row: row.clone(), width, is_working: true }
                    div { class: "commit-graph-message",
                        span { class: "commit-graph-working-label",
                            "{language.label(\"Uncommitted changes\", \"未コミットの変更\", \"Neenmetitaj ŝanĝoj\")} ({count})"
                        }
                        span { class: "commit-graph-module", title: "{module}", "{module_name}" }
                    }
                    span { class: "commit-graph-author" }
                    span { class: "commit-graph-date" }
                    span { class: "commit-graph-hash" }
                }
            },
            RowItem::Commit(commit) => {
                let toggle_hash = hash.clone();
                let module_name = commit.commit.module_name.to_string();
                let author = crate::app_state::account_display_name(&account_names, &commit.account_id);
                let date = commit.time.format("%Y-%m-%d %H:%M").to_string();
                let hash_text = hash.to_string();
                let short_hash = hash_text.chars().take(7).collect::<String>();
                let message = if commit.commit.message.is_empty() {
                    language.label("(no message)", "(メッセージなし)", "(sen mesaĝo)").to_string()
                } else {
                    commit.commit.message.to_string()
                };
                let details = is_expanded.then(|| {
                    let parent_parts = commit
                        .parent
                        .as_ref()
                        .and_then(|parent| commit_parts(&state, parent));
                    let diffs = diff_parts(parent_parts.as_deref(), &commit.commit.parts);
                    (diffs, parent_parts.is_none() && commit.parent.is_some())
                });
                rsx! {
                    div {
                        key: "{hash}",
                        class: "commit-graph-entry",
                        "data-expanded": if is_expanded { "true" } else { "false" },
                        button {
                            r#type: "button",
                            class: "commit-graph-row",
                            "aria-expanded": if is_expanded { "true" } else { "false" },
                            onclick: move |_| {
                                let next = if expanded.peek().as_ref() == Some(&toggle_hash) {
                                    None
                                } else {
                                    Some(toggle_hash.clone())
                                };
                                expanded.set(next);
                            },
                            GraphCell {
                                row: row.clone(),
                                width,
                                is_working: false,
                            }
                            div { class: "commit-graph-message",
                                span { class: "commit-graph-message-text", "{message}" }
                                span { class: "commit-graph-module", "{module_name}" }
                            }
                            span { class: "commit-graph-author", "{author}" }
                            span { class: "commit-graph-date", "{date}" }
                            span {
                                class: "commit-graph-hash mono",
                                title: "{hash_text}",
                                "{short_hash}"
                            }
                        }
                        if let Some((diffs, parent_missing)) = details {
                            div { class: "commit-graph-details",
                                GraphContinuation { row: row.clone(), width }
                                div { class: "commit-graph-details-body",
                                    div { class: "commit-graph-details-meta",
                                        a { href: context.href_with_lang(Location::Event(hash.clone())),
                                            "{language.label(\"Open commit event\", \"コミットのイベントを開く\", \"Malfermi enmeton\")}"
                                        }
                                        a {
                                            href: context
                                                .href_with_lang(Location::Module(commit.module_definition_event_hash.clone())),
                                            "{module_name}"
                                        }
                                        span {
                                            "{commit.commit.parts.len()} {language.label(\"parts\", \"パーツ\", \"partoj\")}"
                                        }
                                    }
                                    if parent_missing {
                                        div { class: "commit-graph-note",
                                            "{language.label(\"The parent commit is not loaded, so the changes cannot be shown.\", \"親コミットを読み込んでいないため、変更を表示できません。\", \"La patra enmeto ne estas ŝarĝita.\")}"
                                        }
                                    } else if diffs.is_empty() {
                                        div { class: "commit-graph-note",
                                            "{language.label(\"No part changes (module info only).\", \"パーツの変更はありません (モジュール情報のみ)。\", \"Neniuj ŝanĝoj de partoj.\")}"
                                        }
                                    } else {
                                        ul { class: "changes-list",
                                            for diff in diffs {
                                                {
                                                    let (kind, badge, name) = match diff {
                                                        PartDiff::Added(name) => ("added", "A", name),
                                                        PartDiff::Modified(name) => ("modified", "M", name),
                                                        PartDiff::Removed(name) => ("removed", "D", name),
                                                    };
                                                    let part_id = definy_event::event::derive_module_part_id(
                                                        &commit.module_definition_event_hash,
                                                        &name,
                                                    );
                                                    rsx! {
                                                        li { key: "{kind}-{name}", class: "changes-item",
                                                            span { class: "change-badge", "data-kind": kind, "{badge}" }
                                                            if kind == "removed" {
                                                                span { class: "changes-item-name", "{name}" }
                                                            } else {
                                                                a {
                                                                    class: "changes-item-name",
                                                                    href: context.href_with_lang(Location::Part(part_id)),
                                                                    "{name}"
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }).collect::<Vec<_>>();
    let is_empty = rendered.is_empty();

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            div { class: "commit-graph-header",
                div { style: "display: grid; gap: 0.2rem;",
                    h2 { style: "font-size: 1.4rem; font-weight: 600; margin: 0;",
                        "{language.label(\"History\", \"履歴\", \"Historio\")}"
                    }
                    div { style: "color: var(--text-secondary); font-size: 0.84rem;",
                        "{language.label(\"Module commits as a graph. Branches appear when several commits share a parent.\", \"モジュールのコミットをグラフで表示します。同じ親から複数のコミットが作られると枝分かれします。\", \"Enmetoj de moduloj kiel grafo.\")}"
                    }
                }
                select {
                    class: "commit-graph-filter",
                    "aria-label": "{language.label(\"Module\", \"モジュール\", \"Modulo\")}",
                    onchange: move |evt: FormEvent| {
                        module_filter.set(evt.value().parse::<EventHashId>().ok());
                    },
                    option { value: "", selected: filter.is_none(),
                        "{language.label(\"All modules\", \"すべてのモジュール\", \"Ĉiuj moduloj\")}"
                    }
                    for module in modules.iter() {
                        option {
                            key: "{module.definition_event_hash}",
                            value: "{module.definition_event_hash}",
                            selected: filter.as_ref() == Some(&module.definition_event_hash),
                            "{module.module_name}"
                        }
                    }
                }
            }
            div { class: "event-detail-card commit-graph",
                if is_empty {
                    div { class: "changes-empty",
                        "{language.label(\"No commits loaded yet.\", \"コミットはまだ読み込まれていません。\", \"Neniuj enmetoj ŝarĝitaj.\")}"
                    }
                }
                {rendered.into_iter()}
            }
        }
    }
}
