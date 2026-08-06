use narumincho_vdom::{EventHandler, Node};

#[derive(Debug, PartialEq)]
pub enum Patch {
    Replace(Node),
    UpdateText(Box<str>),
    AddAttributes(Vec<(String, String)>),
    RemoveAttributes(Vec<String>),
    AddStyles(Vec<(String, String)>),
    RemoveStyles(Vec<String>),
    AddEventListeners(Vec<(String, EventHandler)>),
    RemoveEventListeners(Vec<String>),
    AppendChildren(Vec<Node>),
    RemoveChildren(usize),
}

pub fn diff(old_node: &Node, new_node: &Node) -> Vec<(Vec<usize>, Patch)> {
    let mut patches = Vec::new();
    diff_recursive(old_node, new_node, &mut Vec::new(), &mut patches);
    patches
}

fn diff_recursive(
    old_node: &Node,
    new_node: &Node,
    path: &mut Vec<usize>,
    patches: &mut Vec<(Vec<usize>, Patch)>,
) {
    match (old_node, new_node) {
        (Node::Element(old_element), Node::Element(new_element)) => {
            if old_element.element_name != new_element.element_name {
                patches.push((path.clone(), Patch::Replace(new_node.clone())));
                return;
            }

            // Diff attributes
            let mut add_attributes = Vec::new();
            let mut remove_attributes = Vec::new();

            for (key, value) in &new_element.attributes {
                match old_element
                    .attributes
                    .iter()
                    .find(|(old_key, _)| old_key == key)
                {
                    Some((_, old_value)) => {
                        if old_value != value {
                            add_attributes.push((key.clone(), value.clone()));
                        }
                    }
                    None => {
                        add_attributes.push((key.clone(), value.clone()));
                    }
                }
            }

            for (key, _) in &old_element.attributes {
                if !new_element
                    .attributes
                    .iter()
                    .any(|(new_key, _)| new_key == key)
                {
                    remove_attributes.push(key.clone());
                }
            }

            if !add_attributes.is_empty() {
                patches.push((path.clone(), Patch::AddAttributes(add_attributes)));
            }
            if !remove_attributes.is_empty() {
                patches.push((path.clone(), Patch::RemoveAttributes(remove_attributes)));
            }

            // Diff styles
            let mut add_styles = Vec::new();
            let mut remove_styles = Vec::new();

            for (key, value) in new_element.styles.iter() {
                match old_element.styles.get(key) {
                    Some(old_value) => {
                        if old_value != value {
                            add_styles.push((key.clone(), value.clone()));
                        }
                    }
                    None => {
                        add_styles.push((key.clone(), value.clone()));
                    }
                }
            }

            for (key, _) in old_element.styles.iter() {
                if new_element.styles.get(key).is_none() {
                    remove_styles.push(key.clone());
                }
            }

            if !add_styles.is_empty() {
                patches.push((path.clone(), Patch::AddStyles(add_styles)));
            }
            if !remove_styles.is_empty() {
                patches.push((path.clone(), Patch::RemoveStyles(remove_styles)));
            }

            // Diff event listeners
            let mut add_events = Vec::new();
            let mut remove_events = Vec::new();

            for (key, value) in &new_element.events {
                match old_element
                    .events
                    .iter()
                    .find(|(old_key, _)| old_key == key)
                {
                    Some((_, old_value)) => {
                        if old_value != value {
                            add_events.push((key.clone(), value.clone()));
                        }
                    }
                    None => {
                        add_events.push((key.clone(), value.clone()));
                    }
                }
            }

            for (key, _) in &old_element.events {
                if !new_element.events.iter().any(|(new_key, _)| new_key == key) {
                    remove_events.push(key.clone());
                }
            }

            if !add_events.is_empty() {
                patches.push((path.clone(), Patch::AddEventListeners(add_events)));
            }
            if !remove_events.is_empty() {
                patches.push((path.clone(), Patch::RemoveEventListeners(remove_events)));
            }

            // Diff children
            let old_children = &old_element.children;
            let new_children = &new_element.children;

            let old_keys: Vec<Option<String>> = old_children.iter().map(child_key).collect();
            let new_keys: Vec<Option<String>> = new_children.iter().map(child_key).collect();

            let has_keys =
                old_keys.iter().any(|k| k.is_some()) || new_keys.iter().any(|k| k.is_some());

            if has_keys {
                // Keyed diffing algorithm
                let mut old_key_map = std::collections::HashMap::new();
                for (i, key) in old_keys.iter().enumerate() {
                    if let Some(k) = key {
                        old_key_map.insert(k.clone(), i);
                    }
                }

                let mut matched_old_indices = std::collections::HashSet::new();

                for (new_idx, new_child) in new_children.iter().enumerate() {
                    path.push(new_idx);
                    if let Some(new_key) = &new_keys[new_idx] {
                        if let Some(&old_idx) = old_key_map.get(new_key) {
                            matched_old_indices.insert(old_idx);
                            diff_recursive(&old_children[old_idx], new_child, path, patches);
                        } else {
                            patches.push((path.clone(), Patch::Replace(new_child.clone())));
                        }
                    } else if new_idx < old_children.len()
                        && old_keys[new_idx].is_none()
                        && !matched_old_indices.contains(&new_idx)
                    {
                        matched_old_indices.insert(new_idx);
                        diff_recursive(&old_children[new_idx], new_child, path, patches);
                    } else {
                        patches.push((path.clone(), Patch::Replace(new_child.clone())));
                    }
                    path.pop();
                }
            } else {
                // Unkeyed diffing algorithm
                let min_len = old_children.len().min(new_children.len());

                for i in 0..min_len {
                    path.push(i);
                    diff_recursive(&old_children[i], &new_children[i], path, patches);
                    path.pop();
                }

                if old_children.len() < new_children.len() {
                    let added = new_children[min_len..].to_vec();
                    patches.push((path.clone(), Patch::AppendChildren(added)));
                } else if old_children.len() > new_children.len() {
                    let remove_count = old_children.len() - new_children.len();
                    patches.push((path.clone(), Patch::RemoveChildren(remove_count)));
                }
            }
        }
        (Node::Text(old_text), Node::Text(new_text)) => {
            if old_text != new_text {
                patches.push((path.clone(), Patch::UpdateText(new_text.clone())));
            }
        }
        _ => {
            patches.push((path.clone(), Patch::Replace(new_node.clone())));
        }
    }
}

fn child_key(node: &Node) -> Option<String> {
    match node {
        Node::Element(element) => element
            .attributes
            .iter()
            .find(|(key, _)| key == "key")
            .map(|(_, value)| value.clone()),
        Node::Text(_) => None,
    }
}

pub fn add_event_listener_patches(node: &Node) -> Vec<(Vec<usize>, Patch)> {
    let mut patches = Vec::new();
    add_event_listener_patches_recursive(node, &mut Vec::new(), &mut patches);
    patches
}

fn add_event_listener_patches_recursive(
    node: &Node,
    path: &mut Vec<usize>,
    patches: &mut Vec<(Vec<usize>, Patch)>,
) {
    match node {
        Node::Element(element) => {
            for (event_name, message) in &element.events {
                patches.push((
                    path.clone(),
                    Patch::AddEventListeners(vec![(event_name.clone(), message.clone())]),
                ));
            }
            for (index, child) in element.children.iter().enumerate() {
                path.push(index);
                add_event_listener_patches_recursive(child, path, patches);
                path.pop();
            }
        }
        Node::Text(_) => {}
    }
}

#[cfg(test)]
mod tests {
    use narumincho_vdom::*;

    use super::*;

    #[test]
    fn test_render_with_attributes() {
        let node: Node = Button::new()
            .type_("submit")
            .children(vec![text("hello")])
            .into_node();
        assert_eq!(to_string(&node), "<button type=\"submit\">hello</button>");
    }

    #[test]
    fn test_render_with_escaped_attributes() {
        let node: Node = Button::new().command_for("a \" b").into_node();
        assert_eq!(
            to_string(&node),
            "<button commandFor=\"a &quot; b\"></button>"
        );
    }

    #[test]
    fn test_diff_text() {
        let old: Node = text("hello");
        let new: Node = text("world");
        let patches = diff(&old, &new);
        assert_eq!(patches, vec![(vec![], Patch::UpdateText("world".into()))]);
    }

    #[test]
    fn test_diff_attributes() {
        let old: Node = Button::new()
            .type_("submit")
            .command_for("test")
            .into_node();
        let new: Node = Button::new()
            .type_("button")
            .style(Style::new().color("red"))
            .into_node();
        let patches = diff(&old, &new);

        let expected_add = vec![("type".to_string(), "button".to_string())];
        let expected_remove = vec!["commandFor".to_string()];
        let expected_style = vec![("color".to_string(), "red".to_string())];

        assert_eq!(patches.len(), 3);

        match &patches[0] {
            (path, Patch::AddAttributes(attrs)) => {
                assert_eq!(*path, vec![]);
                assert_eq!(attrs, &expected_add);
            }
            _ => panic!("Expected AddAttributes first"),
        }

        match &patches[1] {
            (path, Patch::RemoveAttributes(attrs)) => {
                assert_eq!(*path, vec![]);
                assert_eq!(attrs, &expected_remove);
            }
            _ => panic!("Expected RemoveAttributes second"),
        }

        match &patches[2] {
            (path, Patch::AddStyles(styles)) => {
                assert_eq!(*path, vec![]);
                assert_eq!(styles, &expected_style);
            }
            _ => panic!("Expected AddStyles third"),
        }
    }

    #[test]
    fn test_diff_children_replace() {
        let old: Node = Button::new().children(vec![text("hello")]).into_node();
        let new: Node = Button::new().children(vec![text("world")]).into_node();
        let patches = diff(&old, &new);
        assert_eq!(patches, vec![(vec![0], Patch::UpdateText("world".into()))]);
    }

    #[test]
    fn test_diff_children_append() {
        let old: Node = Button::new().children(vec![text("hello")]).into_node();
        let new: Node = Button::new()
            .children(vec![text("hello"), text("world")])
            .into_node();
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![], Patch::AppendChildren(vec![text("world")]))]
        );
    }

    #[test]
    fn test_diff_children_remove() {
        let old: Node = Button::new()
            .children(vec![text("hello"), text("world")])
            .into_node();
        let new: Node = Button::new().children(vec![text("hello")]).into_node();
        let patches = diff(&old, &new);
        assert_eq!(patches, vec![(vec![], Patch::RemoveChildren(1))]);
    }

    #[test]
    fn test_diff_recursive() {
        let old: Node = Button::new()
            .children(vec![
                Button::new().children(vec![text("hello")]).into_node(),
            ])
            .into_node();
        let new: Node = Button::new()
            .children(vec![
                Button::new().children(vec![text("world")]).into_node(),
            ])
            .into_node();
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![0, 0], Patch::UpdateText("world".into()))]
        );
    }
}
