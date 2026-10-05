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
