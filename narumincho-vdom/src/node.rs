use std::rc::Rc;

#[derive(Clone, Debug, PartialEq)]
pub struct Element {
    pub element_name: String,
    pub attributes: Vec<(String, String)>,
    pub events: Vec<(String, EventHandler)>,
    pub children: Vec<Node>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Node {
    Element(Element),
    Text(Box<str>),
}

#[derive(Clone)]
pub struct EventHandler(pub Rc<dyn Fn(Box<dyn Fn()>)>);

impl PartialEq for EventHandler {
    fn eq(&self, _other: &Self) -> bool {
        true
    }
}

impl std::fmt::Debug for EventHandler {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("EventHandler").finish()
    }
}
