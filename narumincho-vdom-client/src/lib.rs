use js_sys::Reflect;
use narumincho_vdom::Node;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, JsValue};
mod diff;

pub fn start<State: Clone + 'static, Message: PartialEq + Clone + 'static>(
    initial_state: &State,
    render_fn: impl Fn(&State) -> Node<Message> + 'static,
    update_fn: impl Fn(&State, &Message) -> State + 'static,
) {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");
    let html_element = document
        .document_element()
        .expect("should have a document element");

    let state = std::rc::Rc::new(std::cell::RefCell::new(initial_state.clone()));
    let vdom = render_fn(&state.borrow());

    let first_patches = diff::add_event_listener_patches(&vdom);

    let dispatch = std::rc::Rc::new(std::cell::RefCell::new(None::<Box<dyn Fn(&Message)>>));
    let dispatch_clone = dispatch.clone();
    let html_element_clone = html_element.clone();
    let state_clone = state.clone();
    let vdom_rc = std::rc::Rc::new(std::cell::RefCell::new(vdom));
    let vdom_clone = vdom_rc.clone();

    *dispatch.borrow_mut() = Some(Box::new(move |msg: &Message| {
        let mut current_state = state_clone.borrow_mut();
        *current_state = update_fn(&current_state, &msg);
        let new_vdom = render_fn(&*current_state);
        let old_vdom = vdom_clone.borrow();
        let patches = diff::diff(&old_vdom, &new_vdom);
        drop(old_vdom);
        *vdom_clone.borrow_mut() = new_vdom;

        match *dispatch_clone.borrow() {
            Some(ref d) => {
                apply(&html_element_clone.clone().into(), patches, d);
            }
            None => {
                web_sys::console::error_1(&JsValue::from_str("Dispatch function is not set."));
            }
        }
    }));

    apply(
        &html_element.into(),
        first_patches,
        dispatch.borrow().as_ref().unwrap(),
    );
}

pub fn apply<Message: Clone + 'static>(
    root: &web_sys::Node,
    patches: Vec<(Vec<usize>, diff::Patch<Message>)>,
    dispatch: impl Fn(&Message) + Clone,
) {
    for (path, patch) in patches {
        if let Some(node) = find_node(root, &path) {
            apply_patch(
                node,
                patch,
                dispatch.clone(),
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

fn apply_patch<Message: Clone + 'static>(
    node: web_sys::Node,
    patch: diff::Patch<Message>,
    dispatch: impl Fn(&Message) + Clone,
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
                    let msg = msg.clone();
                    let dispatch = dispatch.clone();
                    let event_name_clone = event_name.clone();
                    let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                        // For form submit events, call preventDefault
                        if event_name_clone == "submit" {
                            event.prevent_default();
                        }
                        dispatch(&msg);
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
                let child_node = create_web_sys_node(&child, dispatch.clone(), callback_key_symbol);
                node.append_child(&child_node).unwrap();
            }
        }
        diff::Patch::RemoveChildren(count) => {
            let child_nodes = node.child_nodes();
            let len = child_nodes.length();
            for i in 0..count {
                if let Some(child) = child_nodes.item(len - 1 - i as u32) {
                    node.remove_child(&child).unwrap();
                }
            }
        }
    }
}

fn create_web_sys_node<Message: Clone + 'static>(
    vdom: &Node<Message>,
    dispatch: impl Fn(&Message) + Clone,
    callback_key_symbol: &js_sys::Symbol,
) -> web_sys::Node {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");

    match vdom {
        Node::Element(el) => {
            let element = document.create_element(&el.element_name).unwrap();
            for (key, value) in &el.attributes {
                element.set_attribute(key, value).unwrap();
            }
            for (event_name, msg) in &el.events {
                let msg = msg.clone();
                let dispatch = dispatch.clone();
                let event_name_clone = event_name.clone();
                let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                    // For form submit events, call preventDefault
                    if event_name_clone == "submit" {
                        event.prevent_default();
                    }
                    dispatch(&msg);
                }) as Box<dyn FnMut(web_sys::Event)>);
                element
                    .add_event_listener_with_callback(&event_name, closure.as_ref().unchecked_ref())
                    .unwrap();
                Reflect::set(&element, &callback_key_symbol, closure.as_ref()).unwrap();
                closure.forget();
            }
            for child in &el.children {
                element
                    .append_child(&create_web_sys_node(
                        child,
                        dispatch.clone(),
                        callback_key_symbol,
                    ))
                    .unwrap();
            }
            element.into()
        }
        Node::Text(text) => document.create_text_node(text).into(),
    }
}
