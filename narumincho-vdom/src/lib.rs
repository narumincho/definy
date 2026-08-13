mod elements;
mod node;
mod route;
#[path = "style.rs"]
mod vdom_style;

pub use elements::button::{Button, ButtonCommand as CommandValue};
pub use elements::*;
pub use node::{AnyStateDispatcher, Element, EventHandler, Node};
pub use route::*;
pub use vdom_style::Style;

pub fn text(text: impl Into<String>) -> Node {
    Node::Text(text.into().into())
}

pub fn normalize_attribute_name(name: &str) -> String {
    if name.starts_with("aria") {
        let mut result = String::from("aria");
        for c in name.chars().skip(4) {
            if c.is_uppercase() {
                result.push('-');
                result.extend(c.to_lowercase());
            } else {
                result.push(c);
            }
        }
        return result;
    }

    if name.starts_with("data") {
        let mut result = String::from("data");
        for c in name.chars().skip(4) {
            if c.is_uppercase() {
                result.push('-');
                result.extend(c.to_lowercase());
            } else {
                result.push(c);
            }
        }
        return result;
    }

    name.to_string()
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
                html.push_str(&normalize_attribute_name(key));
                html.push_str("=\"");
                html.push_str(&attribute_escape(value));
                html.push('"');
            }
            if vdom.styles.iter().len() > 0 {
                html.push_str(" style=\"");
                for (key, value) in vdom.styles.iter() {
                    html.push_str(key);
                    html.push(':');
                    html.push_str(&attribute_escape(value));
                    html.push(';');
                }
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
    fn test_generated_element_attributes_and_enums() {
        use elements::button::{ButtonType, button};

        let btn = button()
            .type_(ButtonType::Submit)
            .disabled(true)
            .disabled(false)
            .attribute("data-test", "value");
        assert!(btn.attributes.contains(&("type".into(), "submit".into())));
        assert!(!btn.attributes.iter().any(|(key, _)| key == "disabled"));
        assert!(
            btn.attributes
                .contains(&("data-test".into(), "value".into()))
        );
    }

    #[test]
    fn aria_attributes_are_rendered_with_html_hyphenated_names() {
        let node = elements::button::Button::new()
            .aria_label("Close")
            .into_node();
        let html = to_string(&node);

        assert!(html.contains("aria-label=\"Close\""));
        assert!(!html.contains("ariaLabel="));
    }

    #[test]
    fn autofocus_attribute_is_rendered() {
        let node = elements::input::input().autofocus(true).into_node();
        let html = to_string(&node);
        assert!(html.contains("autofocus=\"\""));

        let node_off = elements::input::input()
            .autofocus(true)
            .autofocus(false)
            .into_node();
        let html_off = to_string(&node_off);
        assert!(!html_off.contains("autofocus"));
    }
}
