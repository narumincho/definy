use dioxus::prelude::*;

#[component]
pub fn MarkerDef(id: &'static str, color: &'static str) -> Element {
    rsx! {
        marker {
            id: "{id}",
            view_box: "0 0 10 10",
            ref_x: "8",
            ref_y: "5",
            marker_width: "6",
            marker_height: "6",
            orient: "auto-start-reverse",
            path { d: "M 0 1 L 10 5 L 0 9 z", fill: "{color}" }
        }
    }
}

#[component]
pub fn Lifeline(x: u32, y_start: u32, y_end: u32) -> Element {
    rsx! {
        line {
            x1: "{x}",
            y1: "{y_start}",
            x2: "{x}",
            y2: "{y_end}",
            stroke: "#1e293b",
            stroke_width: "1.5",
            stroke_dasharray: "5 5",
        }
    }
}

#[component]
pub fn ActorBox(
    x: u32,
    y: u32,
    width: u32,
    color: &'static str,
    border: &'static str,
    title: &'static str,
) -> Element {
    let center_x = x + width / 2;
    rsx! {
        rect {
            x: "{x}",
            y: "{y}",
            width: "{width}",
            height: "38",
            rx: "8",
            fill: "#0f172a",
            stroke: "{border}",
            stroke_width: "1.8",
        }
        text {
            x: "{center_x}",
            y: "35",
            fill: "{color}",
            font_weight: "bold",
            font_size: "13px",
            text_anchor: "middle",
            "{title}"
        }
    }
}

#[component]
pub fn SequenceArrow(
    x1: u32,
    y1: u32,
    x2: u32,
    y2: u32,
    color: &'static str,
    marker: &'static str,
    dashed: bool,
    label: &'static str,
) -> Element {
    let center_x = (x1 + x2) / 2;
    let label_y = y1 - 7;
    rsx! {
        line {
            x1: "{x1}",
            y1: "{y1}",
            x2: "{x2}",
            y2: "{y2}",
            stroke: "{color}",
            stroke_width: "2",
            stroke_dasharray: if dashed { "4 3" } else { "none" },
            marker_end: "url(#{marker})",
        }
        text {
            x: "{center_x}",
            y: "{label_y}",
            fill: "{color}",
            text_anchor: "middle",
            font_weight: "600",
            "{label}"
        }
    }
}

#[component]
pub fn ActionBox(
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    bg: &'static str,
    border: &'static str,
    text_color: &'static str,
    line1: &'static str,
    line2: Option<&'static str>,
) -> Element {
    let center_x = x + width / 2;
    match line2 {
        Some(second) => {
            let y1 = y + 19;
            let y2 = y + 36;
            rsx! {
                rect {
                    x: "{x}",
                    y: "{y}",
                    width: "{width}",
                    height: "{height}",
                    rx: "6",
                    fill: "{bg}",
                    stroke: "{border}",
                    stroke_width: "1",
                }
                text {
                    x: "{center_x}",
                    y: "{y1}",
                    fill: "{text_color}",
                    text_anchor: "middle",
                    font_size: "11px",
                    font_weight: "600",
                    "{line1}"
                }
                text {
                    x: "{center_x}",
                    y: "{y2}",
                    fill: "{text_color}",
                    text_anchor: "middle",
                    font_size: "10.5px",
                    "{second}"
                }
            }
        }
        None => {
            let y_pos = y + height / 2 + 4;
            rsx! {
                rect {
                    x: "{x}",
                    y: "{y}",
                    width: "{width}",
                    height: "{height}",
                    rx: "6",
                    fill: "{bg}",
                    stroke: "{border}",
                    stroke_width: "1",
                }
                text {
                    x: "{center_x}",
                    y: "{y_pos}",
                    fill: "{text_color}",
                    text_anchor: "middle",
                    font_size: "11px",
                    "{line1}"
                }
            }
        }
    }
}

#[component]
pub fn StepDetailCard(
    step_number: &'static str,
    title: &'static str,
    color: &'static str,
    description: &'static str,
) -> Element {
    rsx! {
        div {
            class: "event-detail-card",
            style: "background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.45rem;",
            div { style: "display: flex; align-items: center; justify-content: space-between;",
                span { style: "font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: {color}; letter-spacing: 0.05em;",
                    "{step_number}"
                }
            }
            h3 { style: "font-size: 0.95rem; font-weight: 700; margin: 0; color: var(--text-primary);",
                "{title}"
            }
            p { style: "font-size: 0.82rem; color: var(--text-secondary); margin: 0; line-height: 1.5;",
                "{description}"
            }
        }
    }
}
