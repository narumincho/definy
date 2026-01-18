use crate::node::{Element, Node};

macro_rules! define_element {
    ($name:ident, $tag:expr, $doc:expr) => {
        #[doc = $doc]
        pub struct $name<Message> {
            pub attributes: Vec<(String, String)>,
            pub events: Vec<(String, Message)>,
            pub children: Vec<Node<Message>>,
        }

        impl<Message> $name<Message> {
            pub fn new() -> Self {
                Self {
                    attributes: Vec::new(),
                    events: Vec::new(),
                    children: Vec::new(),
                }
            }

            pub fn attribute(mut self, key: &str, value: &str) -> Self {
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

            pub fn children(mut self, children: impl Into<Vec<Node<Message>>>) -> Self {
                self.children = children.into();
                self
            }

            pub fn into_node(self) -> Node<Message> {
                Node::Element(Element {
                    element_name: $tag.to_string(),
                    attributes: self.attributes,
                    events: self.events,
                    children: self.children,
                })
            }
        }

        impl<T> Into<Node<T>> for $name<T> {
            fn into(self) -> Node<T> {
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
    Style,
    "style",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/style"
);
define_element!(
    Div,
    "div",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/div"
);

// Link specific
impl<Message> Link<Message> {
    pub fn rel(self, rel: &str) -> Self {
        self.attribute("rel", rel)
    }

    pub fn href(self, href: &str) -> Self {
        self.attribute("href", href)
    }
}

// Input specific
impl<Message> Input<Message> {
    pub fn name(self, name: &str) -> Self {
        self.attribute("name", name)
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
}

impl<Message> Form<Message> {
    /// https://developer.mozilla.org/docs/Web/API/HTMLFormElement/submit_event
    pub fn on_submit(mut self, msg: Message) -> Self {
        self.events.push(("submit".to_string(), msg));
        self
    }
}
