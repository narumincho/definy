use std::any::Any;
use std::collections::hash_map::DefaultHasher;
use std::future::Future;
use std::hash::{Hash, Hasher};
use std::{pin::Pin, rc::Rc};

#[derive(Clone, Debug, PartialEq)]
pub struct Element {
    pub element_name: String,
    pub attributes: Vec<(String, String)>,
    pub styles: crate::Style,
    pub events: Vec<(String, EventHandler)>,
    pub children: Vec<Node>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Node {
    Element(Element),
    Text(Box<str>),
}

pub type AnyStateUpdater = Box<dyn FnOnce(Box<dyn Any>) -> Box<dyn Any>>;
pub type AnyStateDispatcher = Rc<dyn Fn(AnyStateUpdater)>;

pub type EventHandlerClosure = dyn Fn(AnyStateDispatcher) -> Pin<Box<dyn Future<Output = ()>>>;

pub struct EventHandler {
    pub handler: Rc<EventHandlerClosure>,
    pub parameter_hash: u64,
}

impl EventHandler {
    pub fn new<State: 'static, F, Fut>(f: F) -> Self
    where
        F: Fn(Box<dyn Fn(Box<dyn FnOnce(State) -> State>)>) -> Fut + 'static,
        Fut: Future<Output = ()> + 'static,
    {
        let handler = Rc::new(move |any_dispatcher: AnyStateDispatcher| {
            let dispatcher: Box<dyn Fn(Box<dyn FnOnce(State) -> State>)> =
                Box::new(move |state_updater| {
                    let any_dispatcher_clone = Rc::clone(&any_dispatcher);
                    any_dispatcher_clone(Box::new(move |any_state| {
                        let state = *any_state
                            .downcast::<State>()
                            .expect("EventHandler: state downcast failed");
                        let new_state = state_updater(state);
                        Box::new(new_state)
                    }));
                });
            Box::pin(f(dispatcher)) as Pin<Box<dyn Future<Output = ()>>>
        });

        EventHandler {
            handler,
            parameter_hash: 0,
        }
    }

    pub fn with_parameter<State: 'static, F, Fut, P>(f: F, p: P) -> Self
    where
        F: Fn(Box<dyn Fn(Box<dyn FnOnce(State) -> State>)>, &P) -> Fut + 'static,
        Fut: Future<Output = ()> + 'static,
        P: Hash + 'static,
    {
        let mut hasher = DefaultHasher::new();
        p.hash(&mut hasher);
        let h = hasher.finish();
        let handler = Rc::new(move |any_dispatcher: AnyStateDispatcher| {
            let dispatcher: Box<dyn Fn(Box<dyn FnOnce(State) -> State>)> =
                Box::new(move |state_updater| {
                    let any_dispatcher_clone = Rc::clone(&any_dispatcher);
                    any_dispatcher_clone(Box::new(move |any_state| {
                        let state = *any_state
                            .downcast::<State>()
                            .expect("EventHandler: state downcast failed");
                        let new_state = state_updater(state);
                        Box::new(new_state)
                    }));
                });
            Box::pin(f(dispatcher, &p)) as Pin<Box<dyn Future<Output = ()>>>
        });

        EventHandler {
            handler,
            parameter_hash: h,
        }
    }
}

impl Clone for EventHandler {
    fn clone(&self) -> Self {
        Self {
            handler: Rc::clone(&self.handler),
            parameter_hash: self.parameter_hash,
        }
    }
}

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
