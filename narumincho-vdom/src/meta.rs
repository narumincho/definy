use crate::node;

pub struct Meta {
    pub name: String,
}

impl Meta {
    /// https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Elements/meta
    pub fn new<State>(name: &str, content: &str) -> node::Node<State> {
        node::Node::Element(node::Element {
            element_name: "meta".to_string(),
            styles: crate::style::Style::new(),
            attributes: vec![
                ("name".to_string(), name.to_string()),
                ("content".to_string(), content.to_string()),
            ],
            events: Vec::new(),
            children: Vec::new(),
        })
    }
}
