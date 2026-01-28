use std::rc::Rc;

use js_sys::Reflect;
use narumincho_vdom::Node;
use wasm_bindgen::JsCast;
use wasm_bindgen::closure::Closure;

mod diff;

const DOCUMENT: std::sync::LazyLock<web_sys::Document> = std::sync::LazyLock::new(|| {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");
    document
});

pub trait App<State: Clone + 'static, Message: PartialEq + Clone + 'static> {
    fn initial_state(fire: &Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)>) -> State;
    fn render(state: &State) -> Node;
    fn update(state: &State, msg: &Message, fire: &Rc<dyn Fn(Message)>) -> State;
}

pub fn start<
    State: Clone + 'static,
    Message: PartialEq + Clone + 'static,
    A: App<State, Message>,
>() {
    let html_element = DOCUMENT
        .document_element()
        .expect("should have a document element");

    let message_queue = Rc::new(std::cell::RefCell::new(Vec::<Message>::new()));
    let queue_clone = Rc::clone(&message_queue);

    let state_holder = Rc::new(std::cell::RefCell::new(None::<State>));

    // Placeholder for update_view function
    let update_view_holder = Rc::new(std::cell::RefCell::new(None::<Box<dyn Fn()>>));

    let fire_state_update: Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)> = {
        let state_holder = Rc::clone(&state_holder);
        let update_view_holder = Rc::clone(&update_view_holder);
        Rc::new(move |updater| {
            let mut borrow = state_holder.borrow_mut();
            if let Some(old_state) = borrow.take() {
                let new_state = updater(old_state);
                *borrow = Some(new_state);
                drop(borrow);

                if let Some(view_updater) = update_view_holder.borrow().as_ref() {
                    view_updater();
                }
            }
        })
    };

    let initial_s = A::initial_state(&fire_state_update);
    *state_holder.borrow_mut() = Some(initial_s);

    let vdom = A::render(state_holder.borrow().as_ref().unwrap());
    let first_patches = diff::add_event_listener_patches(&vdom);

    let dispatch = Rc::new(std::cell::RefCell::new(None::<Box<dyn Fn()>>));
    let dispatch_weak = Rc::downgrade(&dispatch);

    let dispatch_impl: Rc<dyn Fn()> = {
        let dispatch_weak = dispatch_weak.clone();
        Rc::new(move || {
            if let Some(dispatch) = dispatch_weak.upgrade() {
                if let Some(d) = dispatch.borrow().as_ref() {
                    d();
                }
            }
        })
    };

    let is_updating = Rc::new(std::cell::Cell::new(false));
    let is_updating_clone = Rc::clone(&is_updating);

    let fire: Rc<dyn Fn(Message)> = {
        let queue_clone = Rc::clone(&queue_clone);
        Rc::new(move |m: Message| {
            if is_updating_clone.get() {
                queue_clone.borrow_mut().push(m);
            } else {
                if let Some(dispatch) = dispatch_weak.upgrade() {
                    if let Some(d) = dispatch.borrow().as_ref() {
                        d();
                    } else {
                        queue_clone.borrow_mut().push(m);
                    }
                } else {
                    queue_clone.borrow_mut().push(m);
                }
            }
        })
    };

    let state_holder_clone = Rc::clone(&state_holder);
    let vdom_rc = Rc::new(std::cell::RefCell::new(vdom));
    let vdom_clone = Rc::clone(&vdom_rc);
    let fire_clone = Rc::clone(&fire);

    // Define update_view logic shared by both fires
    let update_view = {
        let state_holder_clone = Rc::clone(&state_holder);
        let vdom_clone = Rc::clone(&vdom_clone);
        let html_element_clone = html_element.clone();
        let dispatch_impl = Rc::clone(&dispatch_impl);
        let queue_clone = Rc::clone(&message_queue);

        Rc::new(move || {
            let state_borrow = state_holder_clone.borrow();
            let state = state_borrow.as_ref().unwrap();

            let new_vdom = A::render(state);
            let old_vdom = vdom_clone.borrow();
            let patches = diff::diff(&old_vdom, &new_vdom);
            drop(old_vdom);
            *vdom_clone.borrow_mut() = new_vdom;

            apply(&html_element_clone.clone().into(), &patches, &dispatch_impl);

            // Drain queue
            let mut queued = queue_clone.borrow_mut();
            let messages: Vec<Message> = queued.drain(..).collect();
            drop(queued);

            for _ in messages {
                dispatch_impl();
            }
        })
    };

    *update_view_holder.borrow_mut() = Some(Box::new({
        let update_view = Rc::clone(&update_view);
        move || update_view()
    }));

    *dispatch.borrow_mut() = Some(Box::new(move || {
        // ---- 1. update ----
        let mut state_borrow = state_holder_clone.borrow_mut();
        if let Some(current_state) = state_borrow.take() {
            is_updating.set(true);
            // let new_state = A::update(&current_state, msg, &fire_clone);
            is_updating.set(false);
            // *state_borrow = Some(new_state);
        }
        drop(state_borrow);

        // ---- 2. VDOM diff & patch & drain ----
        update_view();
    }));

    apply(&html_element.into(), &first_patches, &dispatch_impl);

    {
        let mut queued = message_queue.borrow_mut();
        let messages: Vec<_> = queued.drain(..).collect();
        drop(queued);

        if let Some(ref d) = *dispatch.borrow() {
            for m in messages {
                d();
            }
        }
    }
}

pub fn apply(
    root: &web_sys::Node,
    patches: &Vec<(Vec<usize>, diff::Patch)>,
    dispatch: &Rc<dyn Fn()>,
) {
    for (path, patch) in patches {
        if let Some(node) = find_node(root, &path) {
            apply_patch(
                node,
                patch,
                dispatch,
                &js_sys::Symbol::for_("__narumincho_callback_key"),
            );
        } else {
            web_sys::console::error_1(&format!("Node not found at path {:?}", path).into());
        }
    }
}

fn find_node(root: &web_sys::Node, path: &[usize]) -> Option<web_sys::Node> {
    let mut current = root.clone();
    for &index in path {
        let children = current.child_nodes();
        if let Some(child) = children.item(index as u32) {
            current = child;
        } else {
            return None;
        }
    }
    Some(current)
}

fn apply_patch(
    node: web_sys::Node,
    patch: &diff::Patch,
    dispatch: &Rc<dyn Fn()>,
    callback_key_symbol: &js_sys::Symbol,
) {
    match patch {
        diff::Patch::Replace(new_node) => {
            if let Some(parent) = node.parent_node() {
                let new_web_node = create_web_sys_node(&new_node, dispatch, callback_key_symbol);
                parent.replace_child(&new_web_node, &node).unwrap();
            }
        }
        diff::Patch::UpdateText(text) => {
            node.set_text_content(Some(&text));
        }
        diff::Patch::AddAttributes(attrs) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for (key, value) in attrs {
                    element.set_attribute(&key, &value).unwrap();
                }
            }
        }
        diff::Patch::RemoveAttributes(keys) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for key in keys {
                    element.remove_attribute(&key).unwrap();
                }
            }
        }
        diff::Patch::AddEventListeners(events) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for (event_name, msg) in events {
                    let handler = Rc::clone(&msg.0);
                    let dispatch = Rc::clone(dispatch);
                    let event_name_clone = event_name.clone();
                    let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                        // For form submit events, call preventDefault
                        if event_name_clone == "submit" {
                            event.prevent_default();
                        }
                        let dispatch = Rc::clone(&dispatch);
                        handler(Box::new(move || {
                            dispatch();
                        }));
                    })
                        as Box<dyn FnMut(web_sys::Event)>);
                    element
                        .add_event_listener_with_callback(
                            &event_name,
                            closure.as_ref().unchecked_ref(),
                        )
                        .unwrap();
                    Reflect::set(element, callback_key_symbol, closure.as_ref()).unwrap();
                    closure.forget();
                }
            }
        }
        diff::Patch::RemoveEventListeners(event_names) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for event_name in event_names {
                    if let Ok(value) = Reflect::get(element, &callback_key_symbol) {
                        if let Some(func) = value.dyn_ref::<js_sys::Function>() {
                            element
                                .remove_event_listener_with_callback(&event_name, func)
                                .unwrap();
                        }
                        Reflect::delete_property(element, callback_key_symbol).unwrap();
                    }
                }
            }
        }
        diff::Patch::AppendChildren(children) => {
            for child in children {
                let child_node = create_web_sys_node(&child, dispatch, callback_key_symbol);
                node.append_child(&child_node).unwrap();
            }
        }
        diff::Patch::RemoveChildren(count) => {
            let child_nodes = node.child_nodes();
            let len = child_nodes.length();
            for i in 0..*count {
                if let Some(child) = child_nodes.item(len - 1 - i as u32) {
                    node.remove_child(&child).unwrap();
                }
            }
        }
    }
}

fn create_web_sys_node(
    vdom: &Node,
    dispatch: &Rc<dyn Fn()>,
    callback_key_symbol: &js_sys::Symbol,
) -> web_sys::Node {
    match vdom {
        Node::Element(el) => {
            let element = DOCUMENT.create_element(&el.element_name).unwrap();
            for (key, value) in &el.attributes {
                element.set_attribute(key, value).unwrap();
            }
            for (event_name, msg) in &el.events {
                let handler = Rc::clone(&msg.0);
                let dispatch = Rc::clone(dispatch);
                let event_name_clone = event_name.clone();
                let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                    // For form submit events, call preventDefault
                    if event_name_clone == "submit" {
                        event.prevent_default();
                    }
                    let dispatch = Rc::clone(&dispatch);
                    handler(Box::new(move || {
                        dispatch();
                    }));
                    // dispatch(&msg);
                }) as Box<dyn FnMut(web_sys::Event)>);
                element
                    .add_event_listener_with_callback(&event_name, closure.as_ref().unchecked_ref())
                    .unwrap();
                Reflect::set(&element, &callback_key_symbol, closure.as_ref()).unwrap();
                closure.forget();
            }
            for child in &el.children {
                element
                    .append_child(&create_web_sys_node(child, dispatch, callback_key_symbol))
                    .unwrap();
            }
            element.into()
        }
        Node::Text(text) => DOCUMENT.create_text_node(text).into(),
    }
}
