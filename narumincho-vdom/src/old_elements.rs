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

        impl<State> Default for $name<State> {
            fn default() -> Self {
                Self::new()
            }
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

        impl<State> From<$name<State>> for Node<State> {
            fn from(val: $name<State>) -> Self {
                val.into_node()
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

impl<State> Body<State> {
    pub fn on_keydown(mut self, msg: EventHandler<State>) -> Self {
        self.events.push(("keydown".to_string(), msg));
        self
    }
}

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
    Textarea,
    "textarea",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/textarea"
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
    Select,
    "select",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/select"
);
define_element!(
    Datalist,
    "datalist",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/datalist"
);
define_element!(
    OptionElement,
    "option",
    "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/option"
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
define_element!(
    Svg,
    "svg",
    "https://developer.mozilla.org/docs/Web/SVG/Element/svg"
);
define_element!(
    Path,
    "path",
    "https://developer.mozilla.org/docs/Web/SVG/Element/path"
);
define_element!(
    G,
    "g",
    "https://developer.mozilla.org/docs/Web/SVG/Element/g"
);
define_element!(
    Circle,
    "circle",
    "https://developer.mozilla.org/docs/Web/SVG/Element/circle"
);
define_element!(
    Rect,
    "rect",
    "https://developer.mozilla.org/docs/Web/SVG/Element/rect"
);
define_element!(
    Ellipse,
    "ellipse",
    "https://developer.mozilla.org/docs/Web/SVG/Element/ellipse"
);
define_element!(
    Line,
    "line",
    "https://developer.mozilla.org/docs/Web/SVG/Element/line"
);
define_element!(
    Polyline,
    "polyline",
    "https://developer.mozilla.org/docs/Web/SVG/Element/polyline"
);
define_element!(
    Polygon,
    "polygon",
    "https://developer.mozilla.org/docs/Web/SVG/Element/polygon"
);
define_element!(
    TextElement,
    "text",
    "https://developer.mozilla.org/docs/Web/SVG/Element/text"
);

// SVG specific
impl<State> Svg<State> {
    pub fn view_box(self, view_box: &str) -> Self {
        self.attribute("viewBox", view_box)
    }

    pub fn width(self, width: &str) -> Self {
        self.attribute("width", width)
    }

    pub fn height(self, height: &str) -> Self {
        self.attribute("height", height)
    }
}

impl<State> Path<State> {
    pub fn d(self, d: &str) -> Self {
        self.attribute("d", d)
    }
}

impl<State> Circle<State> {
    pub fn cx(self, cx: &str) -> Self {
        self.attribute("cx", cx)
    }

    pub fn cy(self, cy: &str) -> Self {
        self.attribute("cy", cy)
    }

    pub fn r(self, r: &str) -> Self {
        self.attribute("r", r)
    }
}

impl<State> Rect<State> {
    pub fn x(self, x: &str) -> Self {
        self.attribute("x", x)
    }

    pub fn y(self, y: &str) -> Self {
        self.attribute("y", y)
    }

    pub fn width(self, width: &str) -> Self {
        self.attribute("width", width)
    }

    pub fn height(self, height: &str) -> Self {
        self.attribute("height", height)
    }

    pub fn rx(self, rx: &str) -> Self {
        self.attribute("rx", rx)
    }

    pub fn ry(self, ry: &str) -> Self {
        self.attribute("ry", ry)
    }
}

impl<State> Line<State> {
    pub fn x1(self, x1: &str) -> Self {
        self.attribute("x1", x1)
    }

    pub fn y1(self, y1: &str) -> Self {
        self.attribute("y1", y1)
    }

    pub fn x2(self, x2: &str) -> Self {
        self.attribute("x2", x2)
    }

    pub fn y2(self, y2: &str) -> Self {
        self.attribute("y2", y2)
    }
}

impl<State> TextElement<State> {
    pub fn x(self, x: &str) -> Self {
        self.attribute("x", x)
    }

    pub fn y(self, y: &str) -> Self {
        self.attribute("y", y)
    }
}

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

impl<State> Select<State> {
    pub fn name(self, name: &str) -> Self {
        self.attribute("name", name)
    }

    pub fn value(self, value: &str) -> Self {
        self.attribute("value", value)
    }
}

impl<State> OptionElement<State> {
    pub fn value(self, value: &str) -> Self {
        self.attribute("value", value)
    }
}

// Textarea specific
impl<State> Textarea<State> {
    pub fn name(self, name: &str) -> Self {
        self.attribute("name", name)
    }

    pub fn value(self, value: &str) -> Self {
        self.attribute("value", value)
    }

    pub fn on_input(mut self, msg: EventHandler<State>) -> Self {
        self.events.push(("input".to_string(), msg));
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

#[doc = "https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/a"]
pub struct A<State, L: crate::Route> {
    pub attributes: Vec<(String, String)>,
    pub styles: crate::Style,
    pub events: Vec<(String, EventHandler<State>)>,
    pub children: Vec<Node<State>>,
    _phantom: std::marker::PhantomData<L>,
}

impl<State, L: crate::Route> Default for A<State, L> {
    fn default() -> Self {
        Self::new()
    }
}

impl<State, L: crate::Route> A<State, L> {
    pub fn new() -> Self {
        Self {
            attributes: Vec::new(),
            styles: crate::Style::new(),
            events: Vec::new(),
            children: Vec::new(),
            _phantom: std::marker::PhantomData,
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

    pub fn style(mut self, style: impl Into<crate::Style>) -> Self {
        self.styles = style.into();
        self
    }

    pub fn popover(self) -> Self {
        self.attribute("popover", "auto")
    }

    pub fn children(mut self, children: impl Into<Vec<Node<State>>>) -> Self {
        self.children = children.into();
        self
    }

    pub fn into_node(self) -> Node<State> {
        Node::Element(Element {
            element_name: "a".to_string(),
            attributes: self.attributes,
            styles: self.styles,
            events: self.events,
            children: self.children,
        })
    }

    pub fn href(self, href: impl Into<crate::route::Href<L>>) -> Self {
        let href_val: String = href.into().into();
        self.attribute("href", &href_val)
    }
}

impl<State, L: crate::Route> From<A<State, L>> for Node<State> {
    fn from(val: A<State, L>) -> Self {
        val.into_node()
    }
}
