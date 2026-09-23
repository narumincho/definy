use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::expression_editor::render_root_expression_editor;
use crate::page_context::PageContext;
use crate::part_projection::collect_part_snapshots;
use crate::tree_layout::{
    LayoutOptions, TreeLayoutRenderer, all_samples, compute_layout, expression_to_layout_node,
};

#[derive(Clone, Copy, PartialEq, Eq)]
enum ViewMode {
    Split,
    NewEngineOnly,
    OldUiOnly,
}

#[component]
pub fn TreeLayoutView(state: AppState, context: PageContext) -> Element {
    let language = context.language;
    let samples = all_samples();

    let mut selected_sample_id = use_signal(|| "nested_arithmetic".to_string());
    let mut container_width = use_signal(|| 580.0f32);
    let mut view_mode = use_signal(|| ViewMode::Split);
    let mut show_debug = use_signal(|| false);
    let selected_node_id = use_signal(|| None::<String>);
    let hovered_node_id = use_signal(|| None::<String>);
    let mut custom_part_hash = use_signal(|| None::<String>);

    let parts = collect_part_snapshots(&state);

    // 現在選択されている Expression の解決
    let current_expression = if let Some(hash_str) = custom_part_hash.read().as_ref() {
        parts
            .iter()
            .find(|p| p.definition_event_hash.to_string() == *hash_str)
            .and_then(|p| p.expression.clone())
            .or_else(|| samples.first().map(|s| s.expression.clone()))
    } else {
        samples
            .iter()
            .find(|s| s.id == selected_sample_id.read().as_str())
            .map(|s| s.expression.clone())
            .or_else(|| samples.first().map(|s| s.expression.clone()))
    };

    let expr = current_expression.unwrap_or_else(|| samples[0].expression.clone());

    // 自作レイアウトエンジンによる計算
    let layout_options = LayoutOptions {
        max_width: container_width(),
        ..Default::default()
    };
    let root_layout_node = expression_to_layout_node(&expr, "root");
    let layout_result = compute_layout(&root_layout_node, &layout_options);

    let page_shell_style = crate::layout::page_shell_style("1.2rem");

    let current_sample_info = samples
        .iter()
        .find(|s| s.id == selected_sample_id.read().as_str());

    // 各種ラベル文字列（Dioxus rsx 内でのエスケープ競合を回避）
    let title_text = language.label(
        "Tree Layout Engine Playground",
        "木構造レイアウトエンジン 動作確認",
        "Arba Aranĝo Ludejo",
    );
    let desc_text = language.label(
        "Test dynamic wrapping, inline formatting, and spreadsheet-like table layout as described in docs/dynamic-layout.md.",
        "横幅に収まれば1行でコンパクトにインライン表示し、溢れた場合は自動で改行・インデントする動的レイアウトと、スプレッドシート型の列幅整列を検証できます。",
        "Testu dinamikan faldiĝon kaj tabelan aranĝon.",
    );
    let step1_text = language.label(
        "1. Select Sample Expression / Part",
        "1. サンプル式またはパーツを選択",
        "1. Elektu specimenon",
    );
    let step2_text = language.label(
        "2. Container Width Simulation",
        "2. コンテナ幅シミュレーション",
        "2. Larĝo-simulado",
    );
    let choose_part_text = language.label(
        "-- Or choose from existing parts --",
        "-- または作成済みパーツから選択 --",
        "-- Aŭ elektu el partoj --",
    );
    let view_mode_text = language.label("View Mode:", "表示モード:", "Reĝimo:");
    let debug_btn_text = language.label("Debug Info", "デバッグ情報", "Sencimiga info");
    let new_engine_title = language.label(
        "New Dynamic Layout Engine (Custom)",
        "新レイアウトエンジン (自作)",
        "Nova Dinamika Aranĝo",
    );
    let old_ui_title = language.label(
        "Current Card-Based UI (For Comparison)",
        "現行のカード式UI (比較対象)",
        "Aktuala Karta UI",
    );
    let width_bounded_text =
        language.label("Width bounded box", "幅制限付きコンテナ", "Larĝo-limigita");
    let nested_cards_text = language.label(
        "Recursive nested cards",
        "再帰的な入れ子カード",
        "Rikursaj kartoj",
    );

    let split_label = language.label("Split (Compare)", "比較 (Split)", "Kompari");
    let new_only_label = language.label("New Engine Only", "新レイアウトのみ", "Nova nura");
    let old_only_label = language.label("Current UI Only", "現行UIのみ", "Malnova nura");

    let debug_btn_bg = if show_debug() {
        "rgb(124 192 216 / 0.2)"
    } else {
        "transparent"
    };

    let sample_description = if custom_part_hash.read().is_none() {
        current_sample_info.map(|s| {
            if language == crate::language::Language::Japanese {
                s.description_ja
            } else {
                s.description_en
            }
        })
    } else {
        None
    };

    let root_mode_str = format!("{:?}", layout_result.root.layout_mode);
    let is_root_inline = layout_result.root.layout_mode == crate::tree_layout::LayoutMode::Inline;
    let root_mode_color = if is_root_inline { "#86efac" } else { "#fca5a5" };

    rsx! {
        div { class: "page-shell", style: "{page_shell_style}",
            // ヘッダーセクション
            div { style: "display: grid; gap: 0.4rem;",
                h2 { style: "font-size: 1.5rem; font-weight: 700; color: var(--primary);",
                    "{title_text}"
                }
                div { style: "font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6;",
                    "{desc_text}"
                }
            }

            // 操作コントロールパネル
            div {
                class: "event-detail-card",
                style: "display: grid; gap: 0.85rem; padding: 1rem 1.2rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md);",
                // サンプル式選択
                div { style: "display: grid; gap: 0.35rem;",
                    div { style: "font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);",
                        "{step1_text}"
                    }
                    div { style: "display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;",
                        for sample in &samples {
                            {
                                let s_id = sample.id.to_string();
                                let is_active = custom_part_hash.read().is_none()
                                    && selected_sample_id.read().as_str() == sample.id;
                                let btn_bg = if is_active {
                                    "var(--primary)"
                                } else {
                                    "rgb(255 255 255 / 0.05)"
                                };
                                let btn_color = if is_active { "#0e1720" } else { "var(--text)" };
                                let title = if language == crate::language::Language::Japanese {
                                    sample.title_ja
                                } else {
                                    sample.title_en
                                };
                                rsx! {
                                    button {
                                        key: "{sample.id}",
                                        r#type: "button",
                                        style: "padding: 0.35rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: {btn_bg}; color: {btn_color}; font-size: 0.82rem; font-weight: 500; cursor: pointer; transition: all 0.12s ease;",
                                        onclick: move |_| {
                                            custom_part_hash.set(None);
                                            selected_sample_id.set(s_id.clone());
                                        },
                                        "{title}"
                                    }
                                }
                            }
                        }
                        if !parts.is_empty() {
                            select {
                                style: "padding: 0.35rem 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: rgb(255 255 255 / 0.05); color: var(--text); font-size: 0.82rem; cursor: pointer;",
                                onchange: move |evt: FormEvent| {
                                    let val = evt.value();
                                    if val.is_empty() {
                                        custom_part_hash.set(None);
                                    } else {
                                        custom_part_hash.set(Some(val));
                                    }
                                },
                                option { value: "", "{choose_part_text}" }
                                for p in &parts {
                                    option {
                                        value: "{p.definition_event_hash}",
                                        selected: custom_part_hash.read().as_ref() == Some(&p.definition_event_hash.to_string()),
                                        "{p.part_name}"
                                    }
                                }
                            }
                        }
                    }
                    if let Some(desc) = sample_description {
                        div { style: "font-size: 0.78rem; color: var(--text-secondary); opacity: 0.9; margin-top: 0.2rem;",
                            "{desc}"
                        }
                    }
                }

                // 幅スライダー & プリセット
                div { style: "display: grid; gap: 0.35rem;",
                    div { style: "display: flex; justify-content: space-between; align-items: center;",
                        div { style: "font-size: 0.82rem; font-weight: 600; color: var(--text-secondary);",
                            "{step2_text}"
                        }
                        div {
                            class: "mono",
                            style: "font-size: 0.85rem; color: var(--primary); font-weight: 600;",
                            "{container_width():.0} px"
                        }
                    }
                    div { style: "display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;",
                        input {
                            r#type: "range",
                            min: "200",
                            max: "1100",
                            step: "10",
                            value: "{container_width()}",
                            style: "flex: 1; min-width: 140px; cursor: pointer; accent-color: var(--primary);",
                            oninput: move |evt: FormEvent| {
                                if let Ok(val) = evt.value().parse::<f32>() {
                                    container_width.set(val);
                                }
                            },
                        }
                        div { style: "display: flex; gap: 0.3rem;",
                            for (w, label) in [
                                (320.0, "320px (Mobile)"),
                                (480.0, "480px"),
                                (640.0, "640px"),
                                (850.0, "850px"),
                                (1050.0, "1050px (Wide)"),
                            ]
                            {
                                {
                                    let is_curr = (container_width() - w).abs() < 5.0;
                                    let bg = if is_curr {
                                        "rgb(124 192 216 / 0.25)"
                                    } else {
                                        "rgb(255 255 255 / 0.04)"
                                    };
                                    rsx! {
                                        button {
                                            key: "{w}",
                                            r#type: "button",
                                            style: "padding: 0.2rem 0.5rem; font-size: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: {bg}; cursor: pointer;",
                                            onclick: move |_| container_width.set(w),
                                            "{label}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 表示モード & デバッグトグル
                div { style: "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.6rem;",
                    div { style: "display: flex; align-items: center; gap: 0.4rem;",
                        div { style: "font-size: 0.8rem; color: var(--text-secondary); margin-right: 0.3rem;",
                            "{view_mode_text}"
                        }
                        for (mode, label) in [
                            (ViewMode::Split, split_label),
                            (ViewMode::NewEngineOnly, new_only_label),
                            (ViewMode::OldUiOnly, old_only_label),
                        ]
                        {
                            {
                                let is_active = view_mode() == mode;
                                let bg = if is_active { "var(--primary)" } else { "rgb(255 255 255 / 0.05)" };
                                let fg = if is_active { "#0e1720" } else { "var(--text)" };
                                rsx! {
                                    button {
                                        key: "{label}",
                                        r#type: "button",
                                        style: "padding: 0.25rem 0.6rem; font-size: 0.78rem; font-weight: 500; border-radius: var(--radius-sm); border: 1px solid var(--border); background: {bg}; color: {fg}; cursor: pointer;",
                                        onclick: move |_| view_mode.set(mode),
                                        "{label}"
                                    }
                                }
                            }
                        }
                    }
                    button {
                        r#type: "button",
                        style: "padding: 0.25rem 0.6rem; font-size: 0.78rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: {debug_btn_bg}; cursor: pointer;",
                        onclick: move |_| {
                            let curr = show_debug();
                            show_debug.set(!curr);
                        },
                        "🔍 {debug_btn_text}"
                    }
                }
            }

            // デバッグ情報パネル
            if show_debug() {
                div {
                    class: "mono",
                    style: "font-size: 0.8rem; background: rgb(0 0 0 / 0.35); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 0.8rem 1rem; display: grid; gap: 0.35rem;",
                    div { style: "display: flex; gap: 1.5rem; flex-wrap: wrap;",
                        div { "Total Nodes: {layout_result.node_count}" }
                        div { "Max Depth: {layout_result.max_depth}" }
                        div {
                            "Computed Size: {layout_result.total_width:.1}px × {layout_result.total_height:.1}px"
                        }
                        div { "Target Width Constraint: {container_width():.0}px" }
                        div {
                            "Root Mode: "
                            span { style: "color: {root_mode_color}; font-weight: bold;",
                                "{root_mode_str}"
                            }
                        }
                    }
                    if let Some(sel_id) = selected_node_id.read().as_ref() {
                        div { style: "color: var(--primary); margin-top: 0.2rem; border-top: 1px solid rgb(255 255 255 / 0.1); padding-top: 0.2rem;",
                            "Selected Node: {sel_id}"
                        }
                    }
                }
            }

            // プレビュー表示エリア
            div { style: "display: grid; gap: 1.2rem;",
                // 新レイアウトエンジン表示
                if view_mode() == ViewMode::Split || view_mode() == ViewMode::NewEngineOnly {
                    div { style: "display: grid; gap: 0.4rem;",
                        div { style: "display: flex; justify-content: space-between; align-items: center;",
                            div { style: "font-weight: 600; font-size: 0.95rem; color: #86efac; display: flex; align-items: center; gap: 0.4rem;",
                                span { "✨" }
                                "{new_engine_title}"
                            }
                            div { style: "font-size: 0.75rem; color: var(--text-secondary);",
                                "{width_bounded_text}"
                            }
                        }
                        div { style: "width: {container_width():.0}px; max-width: 100%; border: 1.5px dashed var(--primary); border-radius: var(--radius-md); padding: 1rem 1.2rem; background: var(--surface); box-shadow: var(--shadow-md); transition: width 0.1s ease; box-sizing: border-box; overflow-x: auto; display: flex; flex-direction: column; align-items: flex-start;",
                            TreeLayoutRenderer {
                                node: layout_result.root.clone(),
                                selected_node_id,
                                hovered_node_id,
                            }
                        }
                    }
                }

                // 現行UI表示（比較用）
                if view_mode() == ViewMode::Split || view_mode() == ViewMode::OldUiOnly {
                    div { style: "display: grid; gap: 0.4rem;",
                        div { style: "display: flex; justify-content: space-between; align-items: center;",
                            div { style: "font-weight: 600; font-size: 0.95rem; color: #fca5a5; display: flex; align-items: center; gap: 0.4rem;",
                                span { "⚠️" }
                                "{old_ui_title}"
                            }
                            div { style: "font-size: 0.75rem; color: var(--text-secondary);",
                                "{nested_cards_text}"
                            }
                        }
                        div { style: "width: {container_width():.0}px; max-width: 100%; border: 1.5px dashed rgb(239 68 68 / 0.5); border-radius: var(--radius-md); padding: 1rem 1.2rem; background: rgb(0 0 0 / 0.15); box-sizing: border-box; overflow-x: auto;",
                            {render_root_expression_editor(&state, &context, &Some(expr.clone()), None)}
                        }
                    }
                }
            }
        }
    }
}
