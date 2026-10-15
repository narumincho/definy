//! パーツ定義 (名前・モジュール・説明・型・式) を式のツリーと同じ見た目のコンパクトな木構造で表示し,
//! docs/key.md のキー操作で選択を移動できるようにする.
//!
//! ```text
//! part greet
//!   module  sample
//!   doc     文字列結合を使った挨拶メッセージ
//!   type    String            ← 型のツリーエディタ
//!   value   string-concat ... ← 式のツリーエディタ
//! ```
//!
//! 行の間は W/S (↑/↓) で移動し, E で型・式のツリーの中へ, ツリーのルートで Q (または端で上下) を押すと行に戻る

use std::str::FromStr;

use definy_event::EventHashId;
use definy_event::event::Expression;
use dioxus::prelude::*;

use crate::app_state::AppState;
use crate::expression_editor::ExpressionType;
use crate::page_context::PageContext;
use crate::tree_layout::keyboard::NavKey;

/// パーツ定義のツリーの行
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DefinitionRow {
    /// `part <名前>` の見出し (ツリーのルート)
    Name,
    Module,
    Description,
    Type,
    Value,
}

impl DefinitionRow {
    /// 見出しの下に並ぶ行 (表示順)
    const CHILDREN: [DefinitionRow; 4] = [
        DefinitionRow::Module,
        DefinitionRow::Description,
        DefinitionRow::Type,
        DefinitionRow::Value,
    ];

    fn key(self) -> &'static str {
        match self {
            DefinitionRow::Name => "name",
            DefinitionRow::Module => "module",
            DefinitionRow::Description => "description",
            DefinitionRow::Type => "type",
            DefinitionRow::Value => "value",
        }
    }

    fn element_id(self) -> String {
        format!("part-def-{}", self.key())
    }

    /// 型・式の行の中にあるツリーエディタの枠の ID
    fn inner_tree_id(self) -> Option<String> {
        matches!(self, DefinitionRow::Type | DefinitionRow::Value)
            .then(|| format!("part-def-{}-tree", self.key()))
    }
}

/// 行の間の移動先. 型・式のツリーの中へ入る E は呼び出し側で扱う
pub fn next_row(current: Option<DefinitionRow>, key: NavKey) -> Option<DefinitionRow> {
    let Some(current) = current else {
        return Some(DefinitionRow::Name);
    };
    let rows = [
        DefinitionRow::Name,
        DefinitionRow::Module,
        DefinitionRow::Description,
        DefinitionRow::Type,
        DefinitionRow::Value,
    ];
    let index = rows.iter().position(|row| *row == current)?;
    match key {
        NavKey::Up => index.checked_sub(1).map(|i| rows[i]),
        NavKey::Down => rows.get(index + 1).copied(),
        NavKey::Parent | NavKey::Root => {
            (current != DefinitionRow::Name).then_some(DefinitionRow::Name)
        }
        NavKey::FirstChild => {
            (current == DefinitionRow::Name).then_some(DefinitionRow::CHILDREN[0])
        }
        NavKey::LastChild => (current == DefinitionRow::Name).then_some(DefinitionRow::Value),
        NavKey::Left | NavKey::Right => None,
    }
}

const TREE_ID: &str = "part-definition-tree";

#[component]
pub fn PartDefinitionTree(
    state: AppState,
    context: PageContext,
    part_name: Signal<String>,
    part_description: Signal<String>,
    part_type_expr: Signal<Option<Expression>>,
    expression: Signal<Option<Expression>>,
    module_hash: Signal<Option<EventHashId>>,
    expected_type: Option<ExpressionType>,
) -> Element {
    let language = context.language;
    let mut selected = use_signal(|| None::<DefinitionRow>);

    let modules = crate::module_projection::collect_module_snapshots(&state);
    let module_options: Vec<(String, String)> = modules
        .iter()
        .map(|module| {
            (
                module.definition_event_hash.to_string(),
                module.module_name.clone(),
            )
        })
        .collect();
    let current_module_value = module_hash()
        .map(|hash| hash.to_string())
        .unwrap_or_default();

    let mut select_row = move |row: DefinitionRow| {
        selected.set(Some(row));
        crate::dom::scroll_into_view_nearest(&format!("#{}", row.element_id()));
    };

    // 行の中身を編集する (Enter). 型・式はツリーの中へ入る
    let edit_row = move |row: DefinitionRow| {
        let row_selector = format!("#{}", row.element_id());
        match row {
            DefinitionRow::Name | DefinitionRow::Description => {
                crate::dom::focus_first(&format!("{row_selector} input, {row_selector} textarea"));
            }
            DefinitionRow::Module => {
                crate::dom::click_first(&format!("{row_selector} button"));
            }
            DefinitionRow::Type | DefinitionRow::Value => {
                enter_inner_tree(row);
            }
        }
    };

    // 入力欄・型/式のツリーからこのツリーへ戻る
    let mut return_to_row = move |row: DefinitionRow| {
        selected.set(Some(row));
        crate::dom::focus_first(&format!("#{TREE_ID}"));
    };

    let on_keydown = move |evt: KeyboardEvent| {
        // 子のツリーエディタで処理されたキーはここまで来ない (stop_propagation).
        // 名前・説明の入力欄では Enter / Escape でツリーに戻る
        let key = evt.key();
        let focused_id = crate::dom::active_element_id();
        // peek() の借用を if の本体まで持ち越すと, 本体の set で二重借用になるので先に取り出す
        let current = *selected.peek();
        if focused_id != TREE_ID {
            if let Some(row) = current
                && matches!(row, DefinitionRow::Name | DefinitionRow::Description)
                && (key == Key::Escape || (key == Key::Enter && row == DefinitionRow::Name))
            {
                evt.prevent_default();
                return_to_row(row);
            }
            return;
        }
        match key {
            Key::Enter => {
                evt.prevent_default();
                match current {
                    Some(row) => edit_row(row),
                    None => select_row(DefinitionRow::Name),
                }
            }
            Key::Escape => {
                selected.set(None);
            }
            _ => {
                let Some(nav_key) = NavKey::from_key(&key, evt.modifiers()) else {
                    return;
                };
                evt.prevent_default();
                // 型・式の行で E を押したらそのツリーの中へ入る
                if let Some(row) = current
                    && matches!(nav_key, NavKey::FirstChild | NavKey::LastChild)
                    && row.inner_tree_id().is_some()
                {
                    enter_inner_tree(row);
                    return;
                }
                if let Some(row) = next_row(current, nav_key) {
                    select_row(row);
                }
            }
        }
    };

    let row_state = |row: DefinitionRow| {
        if selected() == Some(row) {
            "selected"
        } else {
            ""
        }
    };
    let on_exit_inner = move |row: DefinitionRow| {
        move |key: NavKey| {
            // ツリーの上端・下端から抜けたら隣の行へ, ルートで Q ならその行へ戻る
            let target = match key {
                NavKey::Up | NavKey::Down => next_row(Some(row), key).unwrap_or(row),
                _ => row,
            };
            return_to_row(target);
        }
    };

    // CSS の anchor-name にも使われるので, 記号を含まない固定の名前にする (1 ページに 1 つ)
    let module_dropdown_name = "part-def-module".to_string();
    let has_type = part_type_expr.read().is_some();

    rsx! {
        div {
            id: TREE_ID,
            class: "part-definition-tree",
            tabindex: "0",
            role: "tree",
            "aria-label": "{language.label(\"Part definition (W/S to move, E to enter type/value, Enter to edit)\", \"パーツ定義 (W/S で移動, E で型・式の中へ, Enter で編集)\", \"Parto-difino (W/S por movi, E por eniri, Enter por redakti)\")}",
            onkeydown: on_keydown,
            onfocusin: move |_| {
                if crate::dom::active_element_id() == TREE_ID && selected.peek().is_none() {
                    selected.set(Some(DefinitionRow::Name));
                }
            },

            // part <名前>
            div {
                id: DefinitionRow::Name.element_id(),
                class: "def-row def-head",
                role: "treeitem",
                "data-state": row_state(DefinitionRow::Name),
                onclick: move |_| selected.set(Some(DefinitionRow::Name)),
                span { class: "def-keyword", "part" }
                input {
                    class: "def-input def-name-input",
                    r#type: "text",
                    name: "part-update-name",
                    value: "{part_name}",
                    placeholder: "my-part",
                    spellcheck: "false",
                    "aria-label": "{language.label(\"Part name\", \"パーツ名\", \"Parto-nomo\")}",
                    onfocusin: move |_| selected.set(Some(DefinitionRow::Name)),
                    oninput: move |evt: FormEvent| part_name.set(evt.value()),
                }
            }
            div { class: "def-children",
                div {
                    id: DefinitionRow::Module.element_id(),
                    class: "def-row",
                    role: "treeitem",
                    "data-state": row_state(DefinitionRow::Module),
                    onclick: move |_| selected.set(Some(DefinitionRow::Module)),
                    span { class: "def-label", "module" }
                    div { class: "def-value def-module",
                        crate::dropdown::SearchableDropdown {
                            name: module_dropdown_name,
                            current_value: current_module_value,
                            options: module_options,
                            on_change: move |val: String| {
                                module_hash.set(EventHashId::from_str(&val).ok());
                                return_to_row(DefinitionRow::Module);
                            },
                        }
                    }
                }
                div {
                    id: DefinitionRow::Description.element_id(),
                    class: "def-row",
                    role: "treeitem",
                    "data-state": row_state(DefinitionRow::Description),
                    onclick: move |_| selected.set(Some(DefinitionRow::Description)),
                    span { class: "def-label", "doc" }
                    textarea {
                        class: "def-input def-description-input",
                        name: "part-update-description",
                        rows: "1",
                        value: "{part_description}",
                        placeholder: "{language.label(\"Description\", \"説明\", \"Priskribo\")}",
                        "aria-label": "{language.label(\"Description\", \"説明\", \"Priskribo\")}",
                        onfocusin: move |_| selected.set(Some(DefinitionRow::Description)),
                        oninput: move |evt: FormEvent| part_description.set(evt.value()),
                    }
                }
                div {
                    id: DefinitionRow::Type.element_id(),
                    class: "def-row def-row-tree",
                    role: "treeitem",
                    "data-state": row_state(DefinitionRow::Type),
                    onclick: move |_| selected.set(Some(DefinitionRow::Type)),
                    span { class: "def-label", "type" }
                    div { class: "def-value",
                        crate::tree_layout::ExpressionTreeEditor {
                            state: state.clone(),
                            context: context.clone(),
                            expression: part_type_expr,
                            expected_type: Some(ExpressionType::Type),
                            max_width: 760.0,
                            container_id: DefinitionRow::Type.inner_tree_id(),
                            on_exit: on_exit_inner(DefinitionRow::Type),
                        }
                    }
                    if has_type {
                        button {
                            r#type: "button",
                            class: "def-row-action",
                            title: "{language.label(\"Clear (no type)\", \"型指定をなくす\", \"Forigi tipon\")}",
                            "aria-label": "{language.label(\"Clear (no type)\", \"型指定をなくす\", \"Forigi tipon\")}",
                            onclick: move |evt: MouseEvent| {
                                evt.stop_propagation();
                                part_type_expr.set(None);
                            },
                            "×"
                        }
                    }
                }
                div {
                    id: DefinitionRow::Value.element_id(),
                    class: "def-row def-row-tree",
                    role: "treeitem",
                    "data-state": row_state(DefinitionRow::Value),
                    onclick: move |_| selected.set(Some(DefinitionRow::Value)),
                    span { class: "def-label", "value" }
                    div { class: "def-value",
                        crate::tree_layout::ExpressionTreeEditor {
                            state: state.clone(),
                            context: context.clone(),
                            expression,
                            expected_type,
                            max_width: 760.0,
                            container_id: DefinitionRow::Value.inner_tree_id(),
                            on_exit: on_exit_inner(DefinitionRow::Value),
                        }
                    }
                }
            }
        }
    }
}

/// 型・式の行のツリーへフォーカスを移す (ツリー側でルートが選ばれる).
/// 式が空でツリーがないときは, テンプレートのボタンにフォーカスする
fn enter_inner_tree(row: DefinitionRow) {
    let Some(tree_id) = row.inner_tree_id() else {
        return;
    };
    crate::dom::focus_first_or(
        &format!("#{tree_id}"),
        Some(&format!("#{} button", row.element_id())),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rows_move_vertically_and_to_the_head() {
        assert_eq!(next_row(None, NavKey::Down), Some(DefinitionRow::Name));
        assert_eq!(
            next_row(Some(DefinitionRow::Name), NavKey::Down),
            Some(DefinitionRow::Module)
        );
        assert_eq!(
            next_row(Some(DefinitionRow::Type), NavKey::Up),
            Some(DefinitionRow::Description)
        );
        assert_eq!(next_row(Some(DefinitionRow::Value), NavKey::Down), None);
        assert_eq!(next_row(Some(DefinitionRow::Name), NavKey::Up), None);
        assert_eq!(
            next_row(Some(DefinitionRow::Value), NavKey::Parent),
            Some(DefinitionRow::Name)
        );
        assert_eq!(next_row(Some(DefinitionRow::Name), NavKey::Parent), None);
    }

    #[test]
    fn head_enters_first_and_last_rows() {
        assert_eq!(
            next_row(Some(DefinitionRow::Name), NavKey::FirstChild),
            Some(DefinitionRow::Module)
        );
        assert_eq!(
            next_row(Some(DefinitionRow::Name), NavKey::LastChild),
            Some(DefinitionRow::Value)
        );
        assert_eq!(
            next_row(Some(DefinitionRow::Module), NavKey::FirstChild),
            None
        );
    }
}
