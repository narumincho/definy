use crate::node::{Element, EventHandler, Node};

macro_rules! define_element {
    ($name:ident, $tag:expr, $doc:expr) => {
        #[doc = $doc]
        pub struct $name<State> {
            pub attributes: Vec<(String, String)>,
            pub styles: crate::Style,
            pub events: Vec<(String, EventHandler<State>)>,
            pub children: Vec<Node<State>>,
        }

        impl<State> $name<State> {
            pub fn new() -> Self {
                Self {
                    attributes: Vec::new(),
                    styles: crate::Style::new(),
                    events: Vec::new(),
                    children: Vec::new(),
                }
            }

            fn attribute(mut self, key: &str, value: &str) -> Self {
                self.attributes.push((key.to_string(), value.to_string()));
                self
            }

            pub fn id(self, id: &str) -> Self {
                self.attribute("id", id)
            }

            pub fn class(self, class: &str) -> Self {
                self.attribute("class", class)
            }

            pub fn type_(self, type_: &str) -> Self {
                self.attribute("type", type_)
            }

            /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/style
            pub fn style(mut self, style: impl Into<crate::Style>) -> Self {
                self.styles = style.into();
                self
            }

            /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/popover
            pub fn popover(self) -> Self {
                self.attribute("popover", "auto")
            }

            pub fn children(mut self, children: impl Into<Vec<Node<State>>>) -> Self {
                self.children = children.into();
                self
            }

            pub fn into_node(self) -> Node<State> {
                Node::Element(Element {
                    element_name: $tag.to_string(),
                    attributes: self.attributes,
                    styles: self.styles,
                    events: self.events,
                    children: self.children,
                })
            }
        }

        impl<State> Into<Node<State>> for $name<State> {
            fn into(self) -> Node<State> {
                self.into_node()
            }
        }
    };
}

define_element!(
    Html,
    "html",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/html"
);
define_element!(
    Head,
    "head",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/head"
);
define_element!(
    Title,
    "title",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/title"
);
define_element!(
    Link,
    "link",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/link"
);
define_element!(
    Script,
    "script",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/script"
);
define_element!(
    Body,
    "body",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/body"
);
define_element!(
    H1,
    "h1",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/h1"
);
define_element!(
    H2,
    "h2",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/h2"
);
define_element!(
    Dialog,
    "dialog",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dialog"
);
define_element!(
    Input,
    "input",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input"
);
define_element!(
    Label,
    "label",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/label"
);
define_element!(
    Form,
    "form",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/form"
);
define_element!(
    StyleElement,
    "style",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/style"
);
define_element!(
    Div,
    "div",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/div"
);
define_element!(
    Header,
    "header",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/header"
);

// Link specific
impl<State> Link<State> {
    pub fn rel(self, rel: &str) -> Self {
        self.attribute("rel", rel)
    }

    pub fn href(self, href: &str) -> Self {
        self.attribute("href", href)
    }
}

// Input specific
impl<State> Input<State> {
    pub fn name(self, name: &str) -> Self {
        self.attribute("name", name)
    }

    pub fn value(self, value: &str) -> Self {
        self.attribute("value", value)
    }

    pub fn autocomplete(self, autocomplete: &str) -> Self {
        self.attribute("autocomplete", autocomplete)
    }

    pub fn required(self) -> Self {
        self.attribute("required", "required")
    }

    pub fn readonly(self) -> Self {
        self.attribute("readonly", "readonly")
    }

    pub fn disabled(self, disabled: bool) -> Self {
        if disabled {
            self.attribute("disabled", "disabled")
        } else {
            self
        }
    }

    pub fn on_change(mut self, msg: EventHandler<State>) -> Self {
        self.events.push(("change".to_string(), msg));
        self
    }
}

impl<State> Form<State> {
    /// https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event
    pub fn on_submit(mut self, msg: EventHandler<State>) -> Self {
        self.events.push(("submit".to_string(), msg));
        self
    }
}

define_element!(
    A,
    "a",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/a"
);

impl<State> A<State> {
    pub fn href(self, href: &str) -> Self {
        self.attribute("href", href)
    }
}
