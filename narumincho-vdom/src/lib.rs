pub struct Element {
    pub element_name: String,
    pub attributes: Vec<(String, String)>,
    pub children: Vec<Node>,
}

pub enum Node {
    Element(Element),
    Text(String),
}

pub fn h(
    element_name: &str,
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    Node::Element(Element {
        element_name: element_name.to_string(),
        attributes: attributes.into(),
        children: children.into(),
    })
}

pub fn text(text: impl Into<String>) -> Node {
    Node::Text(text.into())
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/html
pub fn html(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("html", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/head
pub fn head(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("head", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/body
pub fn body(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("body", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/title
pub fn title(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("title", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/link
pub fn link(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("link", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/script
pub fn script(
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    h("script", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/h1
pub fn h1(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("h1", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button
pub fn button(
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    h("button", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dialog
pub fn dialog(
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    h("dialog", attributes, children)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_with_attributes() {
        let node = h(
            "div",
            vec![("class".to_string(), "container".to_string())],
            vec![text("hello")],
        );
        assert_eq!(to_string(&node), "<div class=\"container\">hello</div>");
    }

    #[test]
    fn test_render_with_escaped_attributes() {
        let node = h(
            "input",
            vec![("value".to_string(), "a \" b".to_string())],
            vec![],
        );
        assert_eq!(to_string(&node), "<input value=\"a &quot; b\"></input>");
    }
}
