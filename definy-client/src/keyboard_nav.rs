use definy_ui::AppState;
use definy_ui::PathStep;
use wasm_bindgen::JsCast;
use web_sys::{Document, HtmlElement};

pub fn handle_keydown(state: AppState, key: &str, shift: bool) -> AppState {
    let mut new_state = state.clone();

    let window = match web_sys::window() {
        Some(w) => w,
        None => return new_state,
    };
    let document = match window.document() {
        Some(d) => d,
        None => return new_state,
    };

    // Do not intercept if user is typing in an input, unless pressing Escape
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

    // Check if there are any expression editor elements on screen
    let all_elements = get_all_paths(&document);
    if all_elements.is_empty() {
        return new_state;
    }

    // Initialize focus if not yet set
    if new_state.focused_path.is_none() {
        if is_movement_key(key) {
            new_state.focused_path = Some(Vec::new());
            // If movement is child navigation ('e' or 'E'), proceed directly into child
            if key == "e" || key == "E" {
                if let Some(child_path) = find_first_or_last_child(
                    all_elements.iter().map(|(p, _)| p.as_slice()),
                    &[],
                    key == "E" || shift,
                ) {
                    new_state.focused_path = Some(child_path);
                }
            }
            scroll_focused_into_view(&document, new_state.focused_path.as_deref());
        }
        return new_state;
    }

    let current_path = new_state.focused_path.as_ref().unwrap();

    let is_shift_q = key == "Q" || (key == "q" && shift);
    let is_plain_q = key == "q" && !shift;
    let is_shift_e = key == "E" || (key == "e" && shift);
    let is_plain_e = key == "e" && !shift;

    if is_shift_q {
        // Shift+Q: ルート要素に移動
        new_state.focused_path = Some(Vec::new());
    } else if is_plain_q {
        // Q: 親に移動
        if !current_path.is_empty() {
            let mut p = current_path.clone();
            p.pop();
            new_state.focused_path = Some(p);
        }
    } else if is_plain_e {
        // E: 子要素先頭に移動
        if let Some(child_path) = find_first_or_last_child(
            all_elements.iter().map(|(p, _)| p.as_slice()),
            current_path,
            false,
        ) {
            new_state.focused_path = Some(child_path);
        }
    } else if is_shift_e {
        // Shift+E: 子要素末尾に移動
        if let Some(child_path) = find_first_or_last_child(
            all_elements.iter().map(|(p, _)| p.as_slice()),
            current_path,
            true,
        ) {
            new_state.focused_path = Some(child_path);
        }
    } else if key == "Enter" {
        focus_input_in_path(&document, current_path);
    } else if is_spatial_key(key) {
        // WASD / 矢印キー: UIの配置の方向に移動
        if let Some(next_path) = find_spatial_sibling(&all_elements, current_path, key) {
            new_state.focused_path = Some(next_path);
        }
    }

    scroll_focused_into_view(&document, new_state.focused_path.as_deref());

    new_state
}

pub fn is_movement_key(k: &str) -> bool {
    matches!(
        k,
        "w" | "W"
            | "a"
            | "A"
            | "s"
            | "S"
            | "d"
            | "D"
            | "ArrowUp"
            | "ArrowDown"
            | "ArrowLeft"
            | "ArrowRight"
            | "q"
            | "Q"
            | "e"
            | "E"
    )
}

fn is_spatial_key(k: &str) -> bool {
    matches!(
        k,
        "w" | "W"
            | "a"
            | "A"
            | "s"
            | "S"
            | "d"
            | "D"
            | "ArrowUp"
            | "ArrowDown"
            | "ArrowLeft"
            | "ArrowRight"
    )
}

fn scroll_focused_into_view(document: &Document, focused_path: Option<&[PathStep]>) {
    if let Some(path) = focused_path {
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
            opts.set_inline(web_sys::ScrollLogicalPosition::Nearest);
            html_el.scroll_into_view_with_scroll_into_view_options(&opts);
        }
    }
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

fn find_first_or_last_child<'a>(
    paths: impl IntoIterator<Item = &'a [PathStep]>,
    current_path: &[PathStep],
    last: bool,
) -> Option<Vec<PathStep>> {
    let paths_vec: Vec<&'a [PathStep]> = paths.into_iter().collect();

    // 1. Direct children with path length = current + 1
    let mut children = Vec::new();
    for &path in &paths_vec {
        if path.len() == current_path.len() + 1 && path.starts_with(current_path) {
            children.push(path.to_vec());
        }
    }

    // 2. If no direct children found, search for any descendants with minimum relative depth
    if children.is_empty() {
        let mut min_depth = usize::MAX;
        for &path in &paths_vec {
            if path.len() > current_path.len() && path.starts_with(current_path) {
                if path.len() < min_depth {
                    min_depth = path.len();
                }
            }
        }
        if min_depth != usize::MAX {
            for &path in &paths_vec {
                if path.len() == min_depth && path.starts_with(current_path) {
                    children.push(path.to_vec());
                }
            }
        }
    }

    if children.is_empty() {
        None
    } else if last {
        Some(children.last().unwrap().clone())
    } else {
        Some(children.first().unwrap().clone())
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
        && let Ok(Some(input_el)) = el.query_selector("input, textarea, select, [tabindex='0']")
        && let Ok(html_el) = input_el.dyn_into::<HtmlElement>()
    {
        let _ = html_el.focus();
    }
}

fn find_spatial_sibling(
    elements: &[(Vec<PathStep>, web_sys::DomRect)],
    current_path: &[PathStep],
    key: &str,
) -> Option<Vec<PathStep>> {
    // Find current rect
    let current_rect = elements
        .iter()
        .find(|(p, _)| p == current_path)
        .map(|(_, r)| r.clone())?;

    let is_up = matches!(key, "w" | "W" | "ArrowUp");
    let is_down = matches!(key, "s" | "S" | "ArrowDown");
    let is_left = matches!(key, "a" | "A" | "ArrowLeft");
    let is_right = matches!(key, "d" | "D" | "ArrowRight");

    let c_left = current_rect.left();
    let c_right = current_rect.right();
    let c_top = current_rect.top();
    let c_bottom = current_rect.bottom();
    let c_cx = (c_left + c_right) / 2.0;
    let c_cy = (c_top + c_bottom) / 2.0;

    let parent = if current_path.is_empty() {
        None
    } else {
        Some(&current_path[..current_path.len() - 1])
    };

    // Helper: evaluate best target in a list of candidate paths
    let evaluate_candidates =
        |candidates: Vec<&(Vec<PathStep>, web_sys::DomRect)>| -> Option<Vec<PathStep>> {
            let mut best_target: Option<Vec<PathStep>> = None;
            let mut best_distance = f64::MAX;

            for (p, r) in candidates {
                let r_left = r.left();
                let r_right = r.right();
                let r_top = r.top();
                let r_bottom = r.bottom();
                let r_cx = (r_left + r_right) / 2.0;
                let r_cy = (r_top + r_bottom) / 2.0;

                let mut is_candidate = false;
                let mut dist_axial = 0.0;
                let mut dist_orth = 0.0;

                if is_up && (r_bottom <= c_cy || r_cy < c_cy) {
                    is_candidate = true;
                    dist_axial = (c_top - r_bottom).max(c_cy - r_cy);
                    dist_orth = (c_cx - r_cx).abs();
                } else if is_down && (r_top >= c_cy || r_cy > c_cy) {
                    is_candidate = true;
                    dist_axial = (r_top - c_bottom).max(r_cy - c_cy);
                    dist_orth = (c_cx - r_cx).abs();
                } else if is_left && (r_right <= c_cx || r_cx < c_cx) {
                    is_candidate = true;
                    dist_axial = (c_left - r_right).max(c_cx - r_cx);
                    dist_orth = (c_cy - r_cy).abs();
                } else if is_right && (r_left >= c_cx || r_cx > c_cx) {
                    is_candidate = true;
                    dist_axial = (r_left - c_right).max(r_cx - c_cx);
                    dist_orth = (c_cy - r_cy).abs();
                }

                if is_candidate {
                    let dist = dist_axial.max(0.0) * 10.0 + dist_orth;
                    if dist < best_distance {
                        best_distance = dist;
                        best_target = Some(p.clone());
                    }
                }
            }
            best_target
        };

    // Filter out:
    // 1. Self
    // 2. Descendants (starts with current_path)
    // 3. Ancestors (current_path starts with p)
    let non_hierarchical_candidates: Vec<_> = elements
        .iter()
        .filter(|(p, _)| {
            p != current_path && !p.starts_with(current_path) && !current_path.starts_with(p)
        })
        .collect();

    // Priority 1: Same parent siblings
    if let Some(parent_path) = parent {
        let siblings: Vec<_> = non_hierarchical_candidates
            .iter()
            .copied()
            .filter(|(p, _)| p.len() == current_path.len() && p.starts_with(parent_path))
            .collect();

        if let Some(target) = evaluate_candidates(siblings) {
            return Some(target);
        }
    }

    // Priority 2: Other non-hierarchical elements in direction
    evaluate_candidates(non_hierarchical_candidates)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_movement_key() {
        assert!(is_movement_key("w"));
        assert!(is_movement_key("W"));
        assert!(is_movement_key("a"));
        assert!(is_movement_key("s"));
        assert!(is_movement_key("d"));
        assert!(is_movement_key("ArrowUp"));
        assert!(is_movement_key("ArrowDown"));
        assert!(is_movement_key("ArrowLeft"));
        assert!(is_movement_key("ArrowRight"));
        assert!(is_movement_key("q"));
        assert!(is_movement_key("Q"));
        assert!(is_movement_key("e"));
        assert!(is_movement_key("E"));

        assert!(!is_movement_key("Enter"));
        assert!(!is_movement_key("Escape"));
        assert!(!is_movement_key("x"));
    }

    #[test]
    fn test_find_first_or_last_child() {
        let p_root: Vec<PathStep> = vec![];
        let p_left: Vec<PathStep> = vec![PathStep::Left];
        let p_right: Vec<PathStep> = vec![PathStep::Right];
        let p_left_cond: Vec<PathStep> = vec![PathStep::Left, PathStep::Condition];
        let p_left_then: Vec<PathStep> = vec![PathStep::Left, PathStep::Then];

        let all_paths = vec![
            p_root.clone(),
            p_left.clone(),
            p_right.clone(),
            p_left_cond.clone(),
            p_left_then.clone(),
        ];

        let path_slices: Vec<&[PathStep]> = all_paths.iter().map(|p| p.as_slice()).collect();

        // Root children: Left and Right
        assert_eq!(
            find_first_or_last_child(path_slices.iter().copied(), &p_root, false),
            Some(p_left.clone())
        );
        assert_eq!(
            find_first_or_last_child(path_slices.iter().copied(), &p_root, true),
            Some(p_right.clone())
        );

        // Left children: LeftCondition and LeftThen
        assert_eq!(
            find_first_or_last_child(path_slices.iter().copied(), &p_left, false),
            Some(p_left_cond.clone())
        );
        assert_eq!(
            find_first_or_last_child(path_slices.iter().copied(), &p_left, true),
            Some(p_left_then.clone())
        );

        // Right has no children
        assert_eq!(
            find_first_or_last_child(path_slices.iter().copied(), &p_right, false),
            None
        );
    }
}
