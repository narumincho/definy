pub struct Element {
    pub element_name: String,
    pub children: Vec<Node>,
}

pub enum Node {
    Element(Element),
    Text(String),
}

pub fn h(element_name: &str, children: impl Into<Vec<Node>>) -> Node {
    Node::Element(Element {
        element_name: element_name.to_string(),
        children: children.into(),
    })
}

pub fn text(text: &str) -> Node {
    Node::Text(text.to_string())
}

pub fn to_html(node: &Node) -> String {
    "<!doctype html>".to_string() + &to_string(node)
}

pub fn to_string(node: &Node) -> String {
    match node {
        Node::Element(vdom) => {
            let mut html = String::new();
            html.push('<');
            html.push_str(&vdom.element_name);
            html.push('>');
            for child in &vdom.children {
                html.push_str(&to_string(child));
            }
            html.push_str("</");
            html.push_str(&vdom.element_name);
            html.push('>');
            html
        }
        Node::Text(text) => html_escape(text),
    }
}

fn html_escape(text: &str) -> String {
    text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}
