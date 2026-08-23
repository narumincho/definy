#![allow(clippy::type_complexity)]
use std::rc::Rc;

use js_sys::Reflect;
use narumincho_vdom::{AnyStateDispatcher, Node};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;

mod diff;
mod element_creation;

pub static DOCUMENT: std::sync::LazyLock<web_sys::Document> = std::sync::LazyLock::new(|| {
    let window = web_sys::window().expect("no global `window` exists");

    window.document().expect("should have a document on window")
});

fn get_current_url() -> web_sys::Url {
    let window = web_sys::window().expect("no global `window` exists");
    let href = window.location().href().expect("location href exists");
    web_sys::Url::new(&href).expect("valid url")
}

pub trait App<State: Clone + 'static> {
    fn initial_state(fire: &Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)>) -> State;
    fn title(state: &State, url: &web_sys::Url) -> String;
    fn render(state: &State, url: &web_sys::Url) -> Node;
}

pub fn start<State: Clone + 'static, A: App<State>>() {
    let body_element = DOCUMENT.body().expect("should have a body element");

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

    let initial_url = get_current_url();
    let vdom = A::render(state_holder.borrow().as_ref().unwrap(), &initial_url);
    let first_patches = diff::add_event_listener_patches(&vdom);

    let initial_title = A::title(state_holder.borrow().as_ref().unwrap(), &initial_url);
    if !initial_title.is_empty() {
        DOCUMENT.set_title(&initial_title);
    }

    let dispatch = Rc::new(std::cell::RefCell::new(
        None::<Box<dyn Fn(Box<dyn FnOnce(State) -> State>)>>,
    ));
    let dispatch_impl: Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)> = {
        let dispatch = Rc::clone(&dispatch);
        Rc::new(move |update_fn| {
            if let Some(d) = dispatch.borrow().as_ref() {
                d(update_fn);
            }
        })
    };

    let any_dispatch: AnyStateDispatcher = {
        let dispatch_impl = Rc::clone(&dispatch_impl);
        Rc::new(move |any_updater| {
            let dispatch_impl = Rc::clone(&dispatch_impl);
            dispatch_impl(Box::new(move |state: State| {
                let any_state: Box<dyn std::any::Any> = Box::new(state);
                let new_any_state = any_updater(any_state);
                *new_any_state
                    .downcast::<State>()
                    .expect("state downcast failed")
            }));
        })
    };

    let is_updating = Rc::new(std::cell::Cell::new(false));

    let state_holder_clone = Rc::clone(&state_holder);
    let vdom_rc = Rc::new(std::cell::RefCell::new(vdom));
    let vdom_clone = Rc::clone(&vdom_rc);

    // Define update_view logic shared by both fires
    let update_view = {
        let state_holder_clone = Rc::clone(&state_holder);
        let vdom_clone = Rc::clone(&vdom_clone);
        let body_element_clone = body_element.clone();
        let any_dispatch = Rc::clone(&any_dispatch);

        Rc::new(move || {
            let state_borrow = state_holder_clone.borrow();
            let state = state_borrow.as_ref().unwrap();

            let current_url = get_current_url();
            let title = A::title(state, &current_url);
            if !title.is_empty() {
                DOCUMENT.set_title(&title);
            }

            let new_vdom = A::render(state, &current_url);
            let old_vdom = vdom_clone.borrow();
            let patches = diff::diff(&old_vdom, &new_vdom);
            drop(old_vdom);
            *vdom_clone.borrow_mut() = new_vdom;

            apply(&body_element_clone.clone().into(), &patches, &any_dispatch);
        })
    };

    *update_view_holder.borrow_mut() = Some(Box::new({
        let update_view = Rc::clone(&update_view);
        move || update_view()
    }));

    *dispatch.borrow_mut() = Some(Box::new(move |update_fn| {
        // ---- 1. update ----
        let mut state_borrow = state_holder_clone.borrow_mut();
        if let Some(current_state) = state_borrow.take() {
            is_updating.set(true);
            let new_state = update_fn(current_state);
            is_updating.set(false);
            *state_borrow = Some(new_state);
        }
        drop(state_borrow);

        // ---- 2. VDOM diff & patch & drain ----
        update_view();
    }));

    if let Some(window) = web_sys::window() {
        // --- 1. Web Navigation API listener (if supported) ---
        if let Ok(navigation) = Reflect::get(&window, &JsValue::from_str("navigation"))
            && !navigation.is_undefined()
        {
            let update_view_for_nav = {
                let update_view_holder = Rc::clone(&update_view_holder);
                move || {
                    if let Some(updater) = update_view_holder.borrow().as_ref() {
                        updater();
                    }
                }
            };
            let on_navigate = Closure::wrap(Box::new(move |event: web_sys::Event| {
                if let Ok(can_intercept) = Reflect::get(&event, &JsValue::from_str("canIntercept"))
                    && can_intercept.is_truthy()
                {
                    let intercept_func = Reflect::get(&event, &JsValue::from_str("intercept"))
                        .unwrap_or(JsValue::UNDEFINED);

                    if intercept_func.is_function() {
                        let update_view_inner = update_view_for_nav.clone();
                        let intercept_handler = Closure::wrap(Box::new(move || {
                            update_view_inner();
                        })
                            as Box<dyn FnMut()>);

                        let handler_val = intercept_handler.as_ref().unchecked_ref();
                        let init_obj = js_sys::Object::new();
                        Reflect::set(&init_obj, &JsValue::from_str("handler"), handler_val)
                            .unwrap();

                        let _ = Reflect::apply(
                            &intercept_func.unchecked_into::<js_sys::Function>(),
                            &event,
                            &js_sys::Array::of1(&init_obj),
                        );

                        intercept_handler.forget();
                    } else {
                        update_view_for_nav();
                    }
                }
            }) as Box<dyn FnMut(web_sys::Event)>);

            let add_event_listener_func =
                Reflect::get(&navigation, &JsValue::from_str("addEventListener"))
                    .expect("addEventListener method exists on navigation");
            let add_event_listener_fn =
                add_event_listener_func.unchecked_into::<js_sys::Function>();

            add_event_listener_fn
                .call2(
                    &navigation,
                    &JsValue::from_str("navigate"),
                    on_navigate.as_ref().unchecked_ref(),
                )
                .expect("failed to add navigation listener");

            on_navigate.forget();
        }

        // --- 2. Fallback: PopState listener ---
        let update_view_for_popstate = {
            let update_view_holder = Rc::clone(&update_view_holder);
            move || {
                if let Some(updater) = update_view_holder.borrow().as_ref() {
                    updater();
                }
            }
        };
        let on_popstate = Closure::wrap(Box::new(move |_event: web_sys::PopStateEvent| {
            update_view_for_popstate();
        }) as Box<dyn FnMut(web_sys::PopStateEvent)>);

        window
            .add_event_listener_with_callback("popstate", on_popstate.as_ref().unchecked_ref())
            .expect("should register popstate listener");

        on_popstate.forget();
    }

    apply(&body_element.into(), &first_patches, &any_dispatch);
}

pub fn apply(
    root: &web_sys::Node,
    patches: &Vec<(Vec<usize>, diff::Patch)>,
    dispatch: &AnyStateDispatcher,
) {
    for (path, patch) in patches {
        if let Some(node) = find_node(root, path) {
            apply_patch(
                node,
                patch,
                dispatch,
                &js_sys::Symbol::for_("__narumincho_callback_key"),
            );
        } else {
            web_sys::console::error_1(&format!("Node not found at path {:?}", path).into());
            log_missing_path(root, path);
        }
    }
}

fn find_node(root: &web_sys::Node, path: &[usize]) -> Option<web_sys::Node> {
    let mut current = root.clone();
    for &index in path {
        current = current.child_nodes().item(index as u32)?;
    }
    Some(current)
}

fn log_missing_path(root: &web_sys::Node, path: &[usize]) {
    let mut current = root.clone();
    for (depth, &index) in path.iter().enumerate() {
        let children = current.child_nodes();
        let len = children.length();
        let node_name = current.node_name();
        if index >= len as usize {
            let mut child_names = Vec::new();
            for i in 0..len {
                if let Some(child) = children.item(i) {
                    child_names.push(child.node_name());
                }
            }
            web_sys::console::error_1(
                &format!(
                    "VDOM path not found at depth {} (index {} >= child_count {}). current='{}' children={:?} full_path={:?}",
                    depth, index, len, node_name, child_names, path
                )
                .into(),
            );
            return;
        }

        if let Some(child) = children.item(index as u32) {
            current = child;
        } else {
            web_sys::console::error_1(
                &format!(
                    "VDOM path traversal failed at depth {} (index {}). current='{}' full_path={:?}",
                    depth, index, node_name, path
                )
                .into(),
            );
            return;
        }
    }
}

fn normalize_html_attribute_name(element: &web_sys::Element, name: &str) -> String {
    let namespace = element.namespace_uri().unwrap_or_default();
    if namespace == "http://www.w3.org/2000/svg"
        || namespace == "http://www.w3.org/1998/Math/MathML"
    {
        return name.to_string();
    }
    if name.starts_with("xlink:") || name.starts_with("xml:") {
        return name.to_string();
    }
    name.to_ascii_lowercase()
}

fn apply_patch(
    node: web_sys::Node,
    patch: &diff::Patch,
    dispatch: &AnyStateDispatcher,
    callback_key_symbol: &js_sys::Symbol,
) {
    match patch {
        diff::Patch::Replace(new_node) => {
            if let Some(parent) = node.parent_node() {
                let new_sys_node = create_web_sys_node(new_node, dispatch, callback_key_symbol);
                let _ = parent.replace_child(&new_sys_node, &node);
            }
        }
        diff::Patch::UpdateText(new_text) => {
            node.set_text_content(Some(new_text));
        }
        diff::Patch::AddAttributes(attributes) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for (key, value) in attributes {
                    let key = normalize_html_attribute_name(element, key);
                    let _ = element.set_attribute(&key, value);
                }
            }
        }
        diff::Patch::RemoveAttributes(attribute_names) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for name in attribute_names {
                    let name = normalize_html_attribute_name(element, name);
                    let _ = element.remove_attribute(&name);
                }
            }
        }
        diff::Patch::AddStyles(styles) => {
            if let Some(element) = node.dyn_ref::<web_sys::HtmlElement>() {
                let style = element.style();
                for (key, value) in styles {
                    let _ = style.set_property(key, value);
                }
            }
        }
        diff::Patch::RemoveStyles(keys) => {
            if let Some(element) = node.dyn_ref::<web_sys::HtmlElement>() {
                let style = element.style();
                for key in keys {
                    let _ = style.remove_property(key);
                }
            }
        }
        diff::Patch::AddEventListeners(events) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for (event_name, event_handler) in events {
                    let handler = Rc::clone(&event_handler.handler);
                    let dispatch = Rc::clone(dispatch);
                    let event_name_clone = event_name.clone();
                    let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                        if event_name_clone == "submit" {
                            event.prevent_default();
                        }
                        let dispatch = Rc::clone(&dispatch);
                        let fut = handler(dispatch);
                        wasm_bindgen_futures::spawn_local(fut);
                    })
                        as Box<dyn FnMut(web_sys::Event)>);
                    let _ = element.add_event_listener_with_callback(
                        event_name,
                        closure.as_ref().unchecked_ref(),
                    );

                    let key = format!("__narumincho_event_{}", event_name);
                    let _ = Reflect::set(element, &JsValue::from_str(&key), closure.as_ref());
                    closure.forget();
                }
            }
        }
        diff::Patch::RemoveEventListeners(event_names) => {
            if let Some(element) = node.dyn_ref::<web_sys::Element>() {
                for event_name in event_names {
                    let key = format!("__narumincho_event_{}", event_name);
                    if let Ok(value) = Reflect::get(element, &JsValue::from_str(&key)) {
                        if let Some(func) = value.dyn_ref::<js_sys::Function>() {
                            let _ = element.remove_event_listener_with_callback(event_name, func);
                        }
                        let _ = Reflect::delete_property(element, &JsValue::from_str(&key));
                    }
                }
            }
        }
        diff::Patch::AppendChildren(children) => {
            for child in children {
                let child_node = create_web_sys_node(child, dispatch, callback_key_symbol);
                let _ = node.append_child(&child_node);
            }
        }
        diff::Patch::RemoveChildren(count) => {
            let child_nodes = node.child_nodes();
            let len = child_nodes.length();
            for i in 0..*count {
                if let Some(child) = child_nodes.item(len - 1 - i as u32) {
                    let _ = node.remove_child(&child);
                }
            }
        }
    }
}

fn create_web_sys_node(
    vdom: &Node,
    dispatch: &AnyStateDispatcher,
    callback_key_symbol: &js_sys::Symbol,
) -> web_sys::Node {
    match vdom {
        Node::Element(el) => {
            let element = crate::element_creation::create_element(&el.element_name, el.namespace);
            for (key, value) in &el.attributes {
                let _ = element.set_attribute(key, value);
            }
            if let Some(html_element) = element.dyn_ref::<web_sys::HtmlElement>() {
                let style = html_element.style();
                for (key, value) in el.styles.iter() {
                    let _ = style.set_property(key, value);
                }
            }
            for (event_name, msg) in &el.events {
                let handler = Rc::clone(&msg.handler);
                let dispatch = Rc::clone(dispatch);
                let event_name_clone = event_name.clone();
                let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                    if event_name_clone == "submit" {
                        event.prevent_default();
                    }
                    let dispatch = Rc::clone(&dispatch);
                    let fut = handler(dispatch);
                    wasm_bindgen_futures::spawn_local(fut);
                }) as Box<dyn FnMut(web_sys::Event)>);
                let _ = element
                    .add_event_listener_with_callback(event_name, closure.as_ref().unchecked_ref());
                let key = format!("__narumincho_event_{}", event_name);
                let _ = Reflect::set(&element, &JsValue::from_str(&key), closure.as_ref());
                closure.forget();
            }
            for child in &el.children {
                let _ = element.append_child(&create_web_sys_node(
                    child,
                    dispatch,
                    callback_key_symbol,
                ));
            }
            element.into()
        }
        Node::Text(text) => DOCUMENT.create_text_node(text).into(),
    }
}
