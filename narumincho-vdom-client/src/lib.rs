use narumincho_vdom::{Node, Patch};
use wasm_bindgen::JsCast;

pub fn render(node: &Node) {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");
    let html_element = document
        .document_element()
        .expect("should have a document element");
    html_element.set_inner_html(&narumincho_vdom::to_html(node));
}

pub fn apply(root: &web_sys::Node, patches: Vec<(Vec<usize>, Patch)>) {
    for (path, patch) in patches {
        if let Some(node) = find_node(root, &path) {
            apply_patch(node, patch);
        } else {
            web_sys::console::error_1(&format!("Node not found at path {:?}", path).into());
        }
    }
}

fn find_node(root: &web_sys::Node, path: &[usize]) -> Option<web_sys::Node> {
    let mut current = root.clone();
    for &index in path {
        let children = current.child_nodes();
        if let Some(child) = children.item(index as u32) {
            current = child;
        } else {
            return None;
        }
    }
    Some(current)
}

fn apply_patch(node: web_sys::Node, patch: Patch) {
    match patch {
        Patch::Replace(new_node) => {
            if let Some(parent) = node.parent_node() {
                let new_web_node = create_web_sys_node(&new_node);
                parent.replace_child(&new_web_node, &node).unwrap();
            }
        }
        Patch::UpdateText(text) => {
            node.set_text_content(Some(&text));
        }
        Patch::AddAttributes(attrs) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for (key, value) in attrs {
                    element.set_attribute(&key, &value).unwrap();
                }
            }
        }
        Patch::RemoveAttributes(keys) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for key in keys {
                    element.remove_attribute(&key).unwrap();
                }
            }
        }
        Patch::AppendChildren(children) => {
            // node is likely an Element, append children
            for child in children {
                let child_node = create_web_sys_node(&child);
                node.append_child(&child_node).unwrap();
            }
        }
        Patch::RemoveChildren(count) => {
            // Remove last n children
            let child_nodes = node.child_nodes();
            let len = child_nodes.length();
            for i in 0..count {
                if let Some(child) = child_nodes.item(len - 1 - i as u32) {
                    node.remove_child(&child).unwrap();
                }
            }
        }
    }
}

fn create_web_sys_node(vdom: &Node) -> web_sys::Node {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");

    match vdom {
        Node::Element(el) => {
            let element = document.create_element(&el.element_name).unwrap();
            for (key, value) in &el.attributes {
                element.set_attribute(key, value).unwrap();
            }
            for child in &el.children {
                element.append_child(&create_web_sys_node(child)).unwrap();
            }
            element.into()
        }
        Node::Text(text) => document.create_text_node(text).into(),
    }
}
