mod button;
mod elements;
mod meta;
mod node;

pub use button::Button;
pub use elements::*;
pub use meta::Meta;
pub use node::Node;

pub fn h<Message>(
    element_name: &str,
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node<Message>>>,
) -> Node<Message> {
    Node::Element(node::Element {
        element_name: element_name.to_string(),
        attributes: attributes.into(),
        events: Vec::new(),
        children: children.into(),
    })
}

pub fn text<Message>(text: impl Into<String>) -> Node<Message> {
    Node::Text(text.into().into())
}

pub fn to_html<Message>(node: &Node<Message>) -> String {
    "<!doctype html>".to_string() + &to_string(node)
}

pub fn to_string<Message>(node: &Node<Message>) -> String {
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
