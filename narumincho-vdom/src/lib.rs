pub struct VDomElement {
    pub element_name: String,
    pub children: Vec<VDomChild>,
}

pub enum VDomChild {
    Element(VDomElement),
    Text(String),
}

pub fn h(element_name: &str, children: impl Into<Vec<VDomChild>>) -> VDomElement {
    VDomElement {
        element_name: element_name.to_string(),
        children: children.into(),
    }
}

pub fn to_html(vdom: &VDomElement) -> String {
    "<!doctype html>".to_string() + &to_string(vdom)
}

pub fn to_string(vdom: &VDomElement) -> String {
    let mut html = String::new();
    html.push_str(&format!("<{}>", vdom.element_name));
    for child in &vdom.children {
        match child {
            VDomChild::Element(child_element) => {
                html.push_str(&to_string(child_element));
            }
            VDomChild::Text(text) => {
                html.push_str(&html_escape(text));
            }
        }
    }
    html.push_str(&format!("</{}>", vdom.element_name));
    html
}

fn html_escape(text: &str) -> String {
    text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}
