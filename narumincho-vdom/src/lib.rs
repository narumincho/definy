mod button;
mod elements;
mod node;

pub use button::Button;
pub use elements::*;
pub use node::Node;

pub fn h<T>(
    element_name: &str,
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node<T>>>,
) -> Node<T> {
    Node::Element(node::Element {
        element_name: element_name.to_string(),
        attributes: attributes.into(),
        events: Vec::new(),
        children: children.into(),
    })
}

pub fn text<T>(text: impl Into<String>) -> Node<T> {
    Node::Text(text.into())
}

impl<T> Into<Node<T>> for String {
    fn into(self) -> Node<T> {
        text(self)
    }
}

pub fn to_html<T>(node: &Node<T>) -> String {
    "<!doctype html>".to_string() + &to_string(node)
}

pub fn to_string<T>(node: &Node<T>) -> String {
    match node {
        Node::Element(vdom) => {
            let mut html = String::new();
            html.push('<');
            html.push_str(&vdom.element_name);
            for (key, value) in &vdom.attributes {
                html.push(' ');
                html.push_str(key);
                html.push_str("=\"");
                html.push_str(&attribute_escape(value));
                html.push('"');
            }
            html.push('>');
            for child in &vdom.children {
                html.push_str(&to_string(child));
            }
            html.push_str("</");
            html.push_str(&vdom.element_name);
            html.push('>');
            html
        }
        Node::Text(text) => text_escape(text),
    }
}

fn attribute_escape(text: &str) -> String {
    text.replace("&", "&amp;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}

fn text_escape(text: &str) -> String {
    text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
}
