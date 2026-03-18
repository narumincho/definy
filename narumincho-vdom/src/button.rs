use crate::node::{self, EventHandler};
use crate::style::Style;

pub struct Button<State> {
    pub attributes: Vec<(String, String)>,
    pub styles: Style,
    pub events: Vec<(String, EventHandler<State>)>,
    pub children: Vec<node::Node<State>>,
}

impl<State> Default for Button<State> {
    fn default() -> Self {
        Self::new()
    }
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

    pub fn style(mut self, style: impl Into<Style>) -> Self {
        self.styles = style.into();
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

impl std::fmt::Display for CommandValue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            CommandValue::ShowModal => "show-modal",
            CommandValue::Close => "close",
            CommandValue::RequestClose => "request-close",
            CommandValue::ShowPopover => "show-popover",
            CommandValue::HidePopover => "hide-popover",
            CommandValue::TogglePopover => "toggle-popover",
            CommandValue::Custom(s) => return write!(f, "{}", s),
        };
        write!(f, "{}", s)
    }
}
