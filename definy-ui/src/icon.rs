//! UI で使う小さなインライン SVG アイコン.
//!
//! 絵文字はフォントや OS によって見た目・サイズが変わり,
//! backdrop-filter を持つ要素の背後に置くとぼやけてしまうため, SVG を使う

use dioxus::prelude::*;

/// 虫眼鏡 (検索) アイコン. 色は `currentColor` を継承する
#[component]
pub fn SearchIcon(#[props(default = "btn-icon")] class: &'static str) -> Element {
    rsx! {
        svg {
            class,
            view_box: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            stroke_width: "2.2",
            stroke_linecap: "round",
            stroke_linejoin: "round",
            "aria-hidden": "true",
            circle { cx: "11", cy: "11", r: "7" }
            line {
                x1: "16.5",
                y1: "16.5",
                x2: "21",
                y2: "21",
            }
        }
    }
}

/// 再生 (評価実行) アイコン. 色は `currentColor` を継承する
#[component]
pub fn PlayIcon(#[props(default = "btn-icon")] class: &'static str) -> Element {
    rsx! {
        svg {
            class,
            view_box: "0 0 24 24",
            fill: "currentColor",
            "aria-hidden": "true",
            path { d: "M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" }
        }
    }
}

/// アクティビティバーやエクスプローラーで使う線画アイコンの種類
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum IconKind {
    Events,
    Parts,
    Modules,
    Accounts,
    Deploy,
    About,
    Settings,
    Changes,
    Sidebar,
    ChevronRight,
    Part,
    Module,
}

/// 線画アイコン. 色は `currentColor` を継承する
#[component]
pub fn Icon(kind: IconKind, #[props(default = "btn-icon")] class: &'static str) -> Element {
    let body = match kind {
        // 時系列に並ぶイベント (縦線と点)
        IconKind::Events => rsx! {
            path { d: "M3 12h4l3-8 4 16 3-8h4" }
        },
        // 中括弧 (式・定義)
        IconKind::Parts => rsx! {
            path { d: "M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1" }
            path { d: "M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1" }
        },
        // 箱 (パッケージ)
        IconKind::Modules | IconKind::Module => rsx! {
            path { d: "M21 8l-9-5-9 5v8l9 5 9-5z" }
            path { d: "M3 8l9 5 9-5" }
            path { d: "M12 13v8" }
        },
        IconKind::Accounts => rsx! {
            circle { cx: "9", cy: "8", r: "3.5" }
            path { d: "M2.5 20a6.5 6.5 0 0 1 13 0" }
            path { d: "M16 4.5a3.5 3.5 0 0 1 0 7" }
            path { d: "M18 14.5a6.5 6.5 0 0 1 3.5 5.5" }
        },
        // 雲へアップロード
        IconKind::Deploy => rsx! {
            path { d: "M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9a4 4 0 0 1 .5 7.97" }
            path { d: "M12 21v-8" }
            path { d: "M9 15.5l3-3 3 3" }
        },
        IconKind::About => rsx! {
            circle { cx: "12", cy: "12", r: "9" }
            path { d: "M12 11v6" }
            path { d: "M12 7.5v.01" }
        },
        IconKind::Settings => rsx! {
            circle { cx: "12", cy: "12", r: "3" }
            path { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" }
        },
        // ブランチ (作業中の変更)
        IconKind::Changes => rsx! {
            circle { cx: "6", cy: "5", r: "2" }
            circle { cx: "6", cy: "19", r: "2" }
            circle { cx: "18", cy: "7", r: "2" }
            path { d: "M6 7v10" }
            path { d: "M18 9a6 6 0 0 1-6 6H6" }
        },
        // サイドバーの開閉
        IconKind::Sidebar => rsx! {
            rect {
                x: "3",
                y: "4",
                width: "18",
                height: "16",
                rx: "2",
            }
            path { d: "M9 4v16" }
        },
        IconKind::ChevronRight => rsx! {
            path { d: "M9 6l6 6-6 6" }
        },
        // ひとつのパーツ (定義記号)
        IconKind::Part => rsx! {
            path { d: "M5 9h14" }
            path { d: "M5 15h14" }
        },
    };
    rsx! {
        svg {
            class,
            view_box: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            stroke_width: "1.7",
            stroke_linecap: "round",
            stroke_linejoin: "round",
            "aria-hidden": "true",
            {body}
        }
    }
}
