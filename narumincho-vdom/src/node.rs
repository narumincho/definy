use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::{pin::Pin, rc::Rc};

pub struct Element<State> {
    pub element_name: String,
    pub attributes: Vec<(String, String)>,
    pub styles: crate::style::Style,
    pub events: Vec<(String, EventHandler<State>)>,
    pub children: Vec<Node<State>>,
}

impl<State> Clone for Element<State> {
    fn clone(&self) -> Self {
        Self {
            element_name: self.element_name.clone(),
            attributes: self.attributes.clone(),
            styles: self.styles.clone(),
            events: self.events.clone(),
            children: self.children.clone(),
        }
    }
}

impl<State> std::fmt::Debug for Element<State> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Element")
            .field("element_name", &self.element_name)
            .field("attributes", &self.attributes)
            .field("styles", &self.styles)
            .field("events", &self.events)
            .field("children", &self.children)
            .finish()
    }
}

impl<State> PartialEq for Element<State> {
    fn eq(&self, other: &Self) -> bool {
        self.element_name == other.element_name
            && self.attributes == other.attributes
            && self.styles == other.styles
            && self.events == other.events
            && self.children == other.children
    }
}

pub enum Node<State> {
    Element(Element<State>),
    Text(Box<str>),
}

impl<State> Clone for Node<State> {
    fn clone(&self) -> Self {
        match self {
            Self::Element(e) => Self::Element(e.clone()),
            Self::Text(t) => Self::Text(t.clone()),
        }
    }
}

impl<State> std::fmt::Debug for Node<State> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Element(e) => e.fmt(f),
            Self::Text(t) => f.debug_tuple("Text").field(t).finish(),
        }
    }
}

impl<State> PartialEq for Node<State> {
    fn eq(&self, other: &Self) -> bool {
        match (self, other) {
            (Self::Element(l0), Self::Element(r0)) => l0 == r0,
            (Self::Text(l0), Self::Text(r0)) => l0 == r0,
            _ => false,
        }
    }
}

pub struct EventHandler<State> {
    pub handler: Rc<
        dyn Fn(Box<dyn Fn(Box<dyn FnOnce(State) -> State>)>) -> Pin<Box<dyn Future<Output = ()>>>,
    >,
    pub parameter_hash: u64,
}

impl<State> EventHandler<State> {
    pub fn new<F, Fut>(f: F) -> Self
    where
        F: Fn(Box<dyn Fn(Box<dyn FnOnce(State) -> State>)>) -> Fut + 'static,
        Fut: Future<Output = ()> + 'static,
    {
        EventHandler {
            handler: Rc::new(move |g| Box::pin(f(g))),
            parameter_hash: 0,
        }
    }

    pub fn with_parameter<F, Fut, P>(f: F, p: P) -> Self
    where
        F: Fn(Box<dyn Fn(Box<dyn FnOnce(State) -> State>)>, &P) -> Fut + 'static,
        Fut: Future<Output = ()> + 'static,
        P: Hash + 'static,
    {
        let mut hasher = DefaultHasher::new();
        p.hash(&mut hasher);
        let h = hasher.finish();
        EventHandler {
            handler: Rc::new(move |g| Box::pin(f(g, &p))),
            parameter_hash: h,
        }
    }
}

impl<State> Clone for EventHandler<State> {
    fn clone(&self) -> Self {
        Self {
            handler: Rc::clone(&self.handler),
            parameter_hash: self.parameter_hash.clone(),
        }
    }
}

impl<State> PartialEq for EventHandler<State> {
    fn eq(&self, _other: &Self) -> bool {
        true
    }
}

impl<State> std::fmt::Debug for EventHandler<State> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("EventHandler").finish()
    }
}
