use crate::node::{self, EventHandler};
use crate::style::Style;

pub struct Button<State> {
    pub attributes: Vec<(String, String)>,
    pub styles: Style,
    pub events: Vec<(String, EventHandler<State>)>,
    pub children: Vec<node::Node<State>>,
}

impl<State> Button<State> {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button
    pub fn new() -> Self {
        Self {
            attributes: Vec::new(),
            events: Vec::new(),
            styles: Style::new(),
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
    pub fn command(mut self, command: CommandValue) -> Self {
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

    pub fn style(mut self, style: &str) -> Self {
        for entry in style.split(';') {
            if let Some((key, value)) = entry.split_once(':') {
                let key = key.trim().to_string();
                let value = value.trim().to_string();
                if !key.is_empty() && !value.is_empty() {
                    self.styles.insert(key, value);
                }
            }
        }
        self
    }

    /// https://developer.mozilla.org/docs/Web/API/Element/click_event
    pub fn on_click(mut self, handler: EventHandler<State>) -> Self {
        self.events.push(("click".to_string(), handler));
        self
    }

    pub fn children(mut self, children: impl Into<Vec<node::Node<State>>>) -> Self {
        self.children = children.into();
        self
    }

    pub fn into_node(self) -> node::Node<State> {
        node::Node::Element(node::Element {
            element_name: "button".to_string(),
            attributes: self.attributes,
            styles: self.styles,
            events: self.events,
            children: self.children,
        })
    }
}

pub enum CommandValue {
    ShowModal,
    Close,
    RequestClose,
    ShowPopover,
    HidePopover,
    TogglePopover,
    Custom(String),
}

impl ToString for CommandValue {
    fn to_string(&self) -> String {
        match self {
            CommandValue::ShowModal => "show-modal".to_string(),
            CommandValue::Close => "close".to_string(),
            CommandValue::RequestClose => "request-close".to_string(),
            CommandValue::ShowPopover => "show-popover".to_string(),
            CommandValue::HidePopover => "hide-popover".to_string(),
            CommandValue::TogglePopover => "toggle-popover".to_string(),
            CommandValue::Custom(s) => s.to_string(),
        }
    }
}
