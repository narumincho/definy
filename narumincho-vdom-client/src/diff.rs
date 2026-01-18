use narumincho_vdom::Node;

#[derive(Debug, PartialEq, Clone)]
pub enum Patch<T> {
    Replace(Node<T>),
    UpdateText(String),
    AddAttributes(Vec<(String, String)>),
    RemoveAttributes(Vec<String>),
    AddEventListeners(Vec<(String, T)>),
    RemoveEventListeners(Vec<String>),
    AppendChildren(Vec<Node<T>>),
    RemoveChildren(usize),
}

pub fn diff<T: PartialEq + Clone>(
    old_node: &Node<T>,
    new_node: &Node<T>,
) -> Vec<(Vec<usize>, Patch<T>)> {
    let mut patches = Vec::new();
    diff_recursive(old_node, new_node, &mut Vec::new(), &mut patches);
    patches
}

fn diff_recursive<T: PartialEq + Clone>(
    old_node: &Node<T>,
    new_node: &Node<T>,
    path: &mut Vec<usize>,
    patches: &mut Vec<(Vec<usize>, Patch<T>)>,
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

            // Diff events
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
            let common_len = std::cmp::min(old_element.children.len(), new_element.children.len());
            for i in 0..common_len {
                path.push(i);
                diff_recursive(
                    &old_element.children[i],
                    &new_element.children[i],
                    path,
                    patches,
                );
                path.pop();
            }

            if new_element.children.len() > old_element.children.len() {
                patches.push((
                    path.clone(),
                    Patch::AppendChildren(
                        new_element.children[old_element.children.len()..].to_vec(),
                    ),
                ));
            } else if new_element.children.len() < old_element.children.len() {
                patches.push((
                    path.clone(),
                    Patch::RemoveChildren(old_element.children.len() - new_element.children.len()),
                ));
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

pub fn add_event_listener_patches<T: PartialEq + Clone>(
    node: &Node<T>,
) -> Vec<(Vec<usize>, Patch<T>)> {
    let mut patches = Vec::new();
    add_event_listener_patches_recursive(node, &mut Vec::new(), &mut patches);
    patches
}

fn add_event_listener_patches_recursive<T: PartialEq + Clone>(
    node: &Node<T>,
    path: &mut Vec<usize>,
    patches: &mut Vec<(Vec<usize>, Patch<T>)>,
) {
    match node {
        Node::Element(element) => {
            for (event_name, message) in &element.events {
                patches.push((
                    path.clone(),
                    Patch::AddEventListeners(vec![(event_name.clone(), message.clone())]),
                ));
            }
            for child in &element.children {
                path.push(element.children.iter().position(|c| c == child).unwrap());
                add_event_listener_patches_recursive(child, path, patches);
                path.pop();
            }
        }
        Node::Text(_) => {}
    }
}

#[cfg(test)]
mod tests {
    use narumincho_vdom::{h, text, to_string};

    use super::*;

    #[test]
    fn test_render_with_attributes() {
        let node: Node<std::convert::Infallible> = h(
            "div",
            vec![("class".to_string(), "container".to_string())],
            vec![text("hello")],
        );
        assert_eq!(to_string(&node), "<div class=\"container\">hello</div>");
    }

    #[test]
    fn test_render_with_escaped_attributes() {
        let node: Node<std::convert::Infallible> = h(
            "input",
            vec![("value".to_string(), "a \" b".to_string())],
            vec![],
        );
        assert_eq!(to_string(&node), "<input value=\"a &quot; b\"></input>");
    }

    #[test]
    fn test_diff_text() {
        let old: Node<std::convert::Infallible> = text("hello");
        let new: Node<std::convert::Infallible> = text("world");
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![], Patch::UpdateText("world".to_string()))]
        );
    }

    #[test]
    fn test_diff_attributes() {
        let old: Node<std::convert::Infallible> = h(
            "div",
            vec![
                ("class".to_string(), "container".to_string()),
                ("id".to_string(), "test".to_string()),
            ],
            vec![],
        );
        let new = h(
            "div",
            vec![
                ("class".to_string(), "wrapper".to_string()),
                ("style".to_string(), "color: red".to_string()),
            ],
            vec![],
        );
        let patches = diff(&old, &new);

        // Order of patches might depend on implementation detail, so we just check containment or specific structure
        // But since we can rely on our implementation:
        // class changed, id removed, style added.

        // Given the implementation loops over new attributes then old attributes.
        // New loop:
        // class: old has it ("container"), new is "wrapper" -> AddAttributes("class", "wrapper") (Wait, logic says Update is AddAttributes)
        // style: old doesn't have it -> AddAttributes("style", "color: red")
        // Old loop:
        // class: new has it.
        // id: new doesn't have it -> RemoveAttributes("id")

        // Patches order: AddAttributes (multiple?), RemoveAttributes.
        // AddAttributes collects all additions.

        let expected_add = vec![
            ("class".to_string(), "wrapper".to_string()),
            ("style".to_string(), "color: red".to_string()),
        ];
        let expected_remove = vec!["id".to_string()];

        // Since my implementation pushes separate patches for AddAttributes and RemoveAttributes
        // And AddAttributes aggregates all additions in one patch.

        assert_eq!(patches.len(), 2);
        // We can't strictly guarantee order of keys in "AddAttributes" unless we sort or the input was sorted.
        // But here inputs are Vecs, so order is preserved.

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
    }

    #[test]
    fn test_diff_children_replace() {
        let old: Node<std::convert::Infallible> = h("div", vec![], vec![text("hello")]);
        let new: Node<std::convert::Infallible> = h("div", vec![], vec![text("world")]);
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![0], Patch::UpdateText("world".to_string()))]
        );
    }

    #[test]
    fn test_diff_children_append() {
        let old: Node<std::convert::Infallible> = h("div", vec![], vec![text("hello")]);
        let new: Node<std::convert::Infallible> =
            h("div", vec![], vec![text("hello"), text("world")]);
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![], Patch::AppendChildren(vec![text("world")]))]
        );
    }

    #[test]
    fn test_diff_children_remove() {
        let old: Node<std::convert::Infallible> =
            h("div", vec![], vec![text("hello"), text("world")]);
        let new = h("div", vec![], vec![text("hello")]);
        let patches = diff(&old, &new);
        assert_eq!(patches, vec![(vec![], Patch::RemoveChildren(1))]);
    }

    #[test]
    fn test_diff_recursive() {
        let old: Node<std::convert::Infallible> =
            h("div", vec![], vec![h("span", vec![], vec![text("hello")])]);
        let new: Node<std::convert::Infallible> =
            h("div", vec![], vec![h("span", vec![], vec![text("world")])]);
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![0, 0], Patch::UpdateText("world".to_string()))]
        );
    }
}
