use std::rc::Rc;

use crate::node::{self, EventHandler};

pub struct Button {
    pub attributes: Vec<(String, String)>,
    pub events: Vec<(String, EventHandler)>,
    pub children: Vec<node::Node>,
}

impl Button {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button
    pub fn new() -> Self {
        Self {
            attributes: Vec::new(),
            events: Vec::new(),
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

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub fn disabled(mut self, disabled: bool) -> Self {
        if disabled {
            self.attributes
                .push(("disabled".to_string(), "".to_string()));
        }
        self
    }

    /// https://developer.mozilla.org/docs/Web/API/Element/click_event
    pub fn on_click(mut self, msg: &'static dyn Fn(Box<dyn Fn()>)) -> Self {
        self.events
            .push(("click".to_string(), EventHandler(Rc::new(msg))));
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
            events: self.events,
            children: self.children,
        })
    }
}
