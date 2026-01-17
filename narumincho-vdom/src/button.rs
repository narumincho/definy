use crate::node;

pub struct Button {
    pub attributes: Vec<(String, String)>,
    pub children: Vec<node::Node>,
}

impl Button {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button
    pub fn new() -> Self {
        Self {
            attributes: Vec::new(),
            children: Vec::new(),
        }
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button#commandfor
    pub fn command_for(mut self, command_for: &str) -> Self {
        self.attributes
            .push(("commandFor".to_string(), command_for.to_string()));
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button#command
    pub fn command(mut self, command: &str) -> Self {
        self.attributes
            .push(("command".to_string(), command.to_string()));
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button#type
    pub fn type_(mut self, type_: &str) -> Self {
        self.attributes
            .push(("type".to_string(), type_.to_string()));
        self
    }

    pub fn children(mut self, children: impl Into<Vec<node::Node>>) -> Self {
        self.children = children.into();
        self
    }

    pub fn into_node(self) -> node::Node {
        node::Node::Element(node::Element {
            element_name: "button".to_string(),
            attributes: self.attributes,
            children: self.children,
        })
    }
}
