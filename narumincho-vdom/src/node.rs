use std::rc::Rc;

#[derive(Clone, Debug, PartialEq)]
pub struct Element<State> {
    pub element_name: String,
    pub attributes: Vec<(String, String)>,
    pub events: Vec<(String, EventHandler<State>)>,
    pub children: Vec<Node<State>>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Node<State> {
    Element(Element<State>),
    Text(Box<str>),
}

#[derive(Clone)]
pub struct EventHandler<State>(pub Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)>);

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

impl<State> EventHandler<State> {
    pub fn new(f: impl Fn(Box<dyn FnOnce(State) -> State>) + 'static) -> Self {
        Self(Rc::new(f))
    }
}
