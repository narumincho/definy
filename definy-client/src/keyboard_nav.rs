use definy_ui::AppState;
use definy_ui::PathStep;
use wasm_bindgen::JsCast;
use web_sys::{Document, HtmlElement};

pub fn handle_keydown(state: AppState, key: String) -> AppState {
    let mut new_state = state.clone();

    let window = web_sys::window().unwrap();
    let document = window.document().unwrap();

    // Do not intercept if user is typing in an input
    if let Some(active) = document.active_element() {
        let tag = active.tag_name().to_lowercase();
        if tag == "input" || tag == "textarea" {
            if key == "Escape" {
                if let Ok(html_el) = active.dyn_into::<HtmlElement>() {
                    let _ = html_el.blur();
                }
                return new_state;
            }
            return state;
        }
    }

    if new_state.focused_path.is_none() {
        if is_movement_key(&key) {
            new_state.focused_path = Some(Vec::new());
        }
        return new_state;
    }

    let current_path = new_state.focused_path.as_ref().unwrap();

    match key.as_str() {
        "q" => {
            if !current_path.is_empty() {
                let mut p = current_path.clone();
                p.pop();
                new_state.focused_path = Some(p);
            }
        }
        "Q" => {
            new_state.focused_path = Some(Vec::new());
        }
        "e" | "E" => {
            if let Some(child_path) = find_first_or_last_child(&document, current_path, key == "E")
            {
                new_state.focused_path = Some(child_path);
            }
        }
        "Enter" => {
            focus_input_in_path(&document, current_path);
        }
        "w" | "ArrowUp" | "s" | "ArrowDown" | "a" | "ArrowLeft" | "d" | "ArrowRight" => {
            if let Some(next_path) = find_spatial_sibling(&document, current_path, &key) {
                new_state.focused_path = Some(next_path);
            }
        }
        _ => {}
    }

    // Scroll into view if selected
    if let Some(path) = &new_state.focused_path {
        let path_str = definy_ui::path_to_string(path);
        let selector = if path_str.is_empty() {
            "[data-path='']".to_string()
        } else {
            format!("[data-path='{}']", path_str)
        };
        if let Ok(Some(el)) = document.query_selector(&selector)
            && let Ok(html_el) = el.dyn_into::<HtmlElement>()
        {
            let opts = web_sys::ScrollIntoViewOptions::new();
            opts.set_behavior(web_sys::ScrollBehavior::Smooth);
            opts.set_block(web_sys::ScrollLogicalPosition::Nearest);
            html_el.scroll_into_view_with_scroll_into_view_options(&opts);
        }
    }

    new_state
}

fn is_movement_key(k: &str) -> bool {
    matches!(
        k,
        "w" | "a"
            | "s"
            | "d"
            | "ArrowUp"
            | "ArrowDown"
            | "ArrowLeft"
            | "ArrowRight"
            | "q"
            | "e"
            | "Q"
            | "E"
    )
}

fn get_all_paths(document: &Document) -> Vec<(Vec<PathStep>, web_sys::DomRect)> {
    let mut elements = Vec::new();
    if let Ok(nodelist) = document.query_selector_all("[data-path]") {
        for i in 0..nodelist.length() {
            if let Some(node) = nodelist.item(i)
                && let Ok(el) = node.dyn_into::<HtmlElement>()
            {
                let path_str = el.get_attribute("data-path").unwrap_or_default();
                if let Some(path) = definy_ui::string_to_path(&path_str) {
                    elements.push((path, el.get_bounding_client_rect()));
                }
            }
        }
    }
    elements
}

fn find_first_or_last_child(
    document: &Document,
    current_path: &[PathStep],
    last: bool,
) -> Option<Vec<PathStep>> {
    let elements = get_all_paths(document);
    let mut children = Vec::new();
    for (path, _) in elements {
        if path.len() == current_path.len() + 1 && path[..current_path.len()] == *current_path {
            children.push(path);
        }
    }
    if children.is_empty() {
        None
    } else {
        if last {
            Some(children.last().unwrap().clone())
        } else {
            Some(children.first().unwrap().clone())
        }
    }
}

fn focus_input_in_path(document: &Document, current_path: &[PathStep]) {
    let path_str = definy_ui::path_to_string(current_path);
    let selector = if path_str.is_empty() {
        "[data-path='']".to_string()
    } else {
        format!("[data-path='{}']", path_str)
    };
    if let Ok(Some(el)) = document.query_selector(&selector)
        && let Ok(input) = el.query_selector("input, textarea")
        && let Some(input_el) = input
        && let Ok(html_el) = input_el.dyn_into::<HtmlElement>()
    {
        let _ = html_el.focus();
    }
}

fn find_spatial_sibling(
    document: &Document,
    current_path: &[PathStep],
    key: &str,
) -> Option<Vec<PathStep>> {
    let elements = get_all_paths(document);

    // Find current rect
    let current_rect = elements
        .iter()
        .find(|(p, _)| p == current_path)
        .map(|(_, r): &(Vec<PathStep>, web_sys::DomRect)| r.clone())?;

    let is_up = key == "w" || key == "ArrowUp";
    let is_down = key == "s" || key == "ArrowDown";
    let is_left = key == "a" || key == "ArrowLeft";
    let is_right = key == "d" || key == "ArrowRight";

    let mut best_target: Option<Vec<PathStep>> = None;
    let mut best_distance = f64::MAX;

    let c_left = current_rect.left();
    let c_right = current_rect.right();
    let c_top = current_rect.top();
    let c_bottom = current_rect.bottom();
    let c_cx = (c_left + c_right) / 2.0;
    let c_cy = (c_top + c_bottom) / 2.0;

    for (p, r) in elements {
        if p == current_path {
            continue;
        }

        let r_left = r.left();
        let r_right = r.right();
        let r_top = r.top();
        let r_bottom = r.bottom();
        let r_cx = (r_left + r_right) / 2.0;
        let r_cy = (r_top + r_bottom) / 2.0;

        let mut is_candidate = false;
        let mut dist_axial = 0.0;
        let mut dist_orth = 0.0;

        if is_up && r_bottom <= c_cy {
            is_candidate = true;
            dist_axial = c_top - r_bottom;
            if dist_axial < 0.0 {
                dist_axial = 0.0;
            }
            dist_orth = (c_cx - r_cx).abs();
        } else if is_down && r_top >= c_cy {
            is_candidate = true;
            dist_axial = r_top - c_bottom;
            if dist_axial < 0.0 {
                dist_axial = 0.0;
            }
            dist_orth = (c_cx - r_cx).abs();
        } else if is_left && r_right <= c_cx {
            is_candidate = true;
            dist_axial = c_left - r_right;
            if dist_axial < 0.0 {
                dist_axial = 0.0;
            }
            dist_orth = (c_cy - r_cy).abs();
        } else if is_right && r_left >= c_cx {
            is_candidate = true;
            dist_axial = r_left - c_right;
            if dist_axial < 0.0 {
                dist_axial = 0.0;
            }
            dist_orth = (c_cy - r_cy).abs();
        }

        if is_candidate {
            // Favor axial closeness heavily over orthogonal closeness, but penalize non-overlapping orthogonal.
            // Using a heuristic distance:
            let dist = dist_axial * 10.0 + dist_orth;
            if dist < best_distance {
                best_distance = dist;
                best_target = Some(p);
            }
        }
    }

    best_target
}
