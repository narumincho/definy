use std::rc::Rc;

use js_sys::Reflect;
use narumincho_vdom::Node;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen::closure::Closure;

mod diff;

pub const DOCUMENT: std::sync::LazyLock<web_sys::Document> = std::sync::LazyLock::new(|| {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");
    document
});

pub trait App<State: Clone + 'static> {
    fn initial_state(fire: &Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)>) -> State;
    fn render(state: &State) -> Node<State>;
    fn on_navigate(state: State, url: String) -> State {
        let _ = url;
        state
    }
}

pub fn start<State: Clone + 'static, A: App<State>>() {
    let html_element = DOCUMENT
        .document_element()
        .expect("should have a document element");

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

    let is_updating = Rc::new(std::cell::Cell::new(false));

    let state_holder_clone = Rc::clone(&state_holder);
    let vdom_rc = Rc::new(std::cell::RefCell::new(vdom));
    let vdom_clone = Rc::clone(&vdom_rc);

    // Define update_view logic shared by both fires
    let update_view = {
        let state_holder_clone = Rc::clone(&state_holder);
        let vdom_clone = Rc::clone(&vdom_clone);
        let html_element_clone = html_element.clone();
        let dispatch_impl = Rc::clone(&dispatch_impl);

        Rc::new(move || {
            let state_borrow = state_holder_clone.borrow();
            let state = state_borrow.as_ref().unwrap();

            let new_vdom = A::render(state);
            let old_vdom = vdom_clone.borrow();
            let patches = diff::diff(&old_vdom, &new_vdom);
            drop(old_vdom);
            *vdom_clone.borrow_mut() = new_vdom;

            apply(&html_element_clone.clone().into(), &patches, &dispatch_impl);
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
        if let Ok(navigation) = Reflect::get(&window, &JsValue::from_str("navigation")) {
            if !navigation.is_undefined() {
                let dispatch_for_nav = Rc::clone(&dispatch_impl);
                let on_navigate = Closure::wrap(Box::new(move |event: web_sys::Event| {
                    if let Ok(can_intercept) =
                        Reflect::get(&event, &JsValue::from_str("canIntercept"))
                    {
                        if can_intercept.is_truthy() {
                            if let Ok(user_initiated) =
                                Reflect::get(&event, &JsValue::from_str("userInitiated"))
                            {
                                // Only intercept if it was a user click (not script navigation, etc) if we want
                                // Or always intercept. Let's intercept and call .intercept() if available
                                if let Ok(destination) =
                                    Reflect::get(&event, &JsValue::from_str("destination"))
                                {
                                    if let Ok(url_val) =
                                        Reflect::get(&destination, &JsValue::from_str("url"))
                                    {
                                        if let Some(url_str) = url_val.as_string() {
                                            // The modern way to handle this in Navigation API is to call event.intercept()
                                            // preventDefault() cancels the navigation entirely (e.g., URL bar doesn't update).
                                            // Usually, VDOM routers want the URL bar to update.
                                            let intercept_func = Reflect::get(
                                                &event,
                                                &JsValue::from_str("intercept"),
                                            )
                                            .unwrap_or(JsValue::UNDEFINED);

                                            let dispatch = Rc::clone(&dispatch_for_nav);

                                            if intercept_func.is_function() {
                                                let url_for_intercept = url_str.clone();
                                                let intercept_handler =
                                                    Closure::wrap(Box::new(move || {
                                                        let dispatch_inner = Rc::clone(&dispatch);
                                                        let url_for_closure =
                                                            url_for_intercept.clone();
                                                        dispatch_inner(Box::new(
                                                            move |state: State| {
                                                                A::on_navigate(
                                                                    state,
                                                                    url_for_closure,
                                                                )
                                                            },
                                                        ));
                                                    })
                                                        as Box<dyn FnMut()>);

                                                let intercept_options = js_sys::Object::new();
                                                Reflect::set(
                                                    &intercept_options,
                                                    &JsValue::from_str("handler"),
                                                    intercept_handler.as_ref(),
                                                )
                                                .unwrap();

                                                Reflect::apply(
                                                    intercept_func.unchecked_ref(),
                                                    &event,
                                                    &js_sys::Array::of1(&intercept_options),
                                                )
                                                .unwrap();
                                                intercept_handler.forget();
                                            } else {
                                                event.prevent_default();
                                                dispatch(Box::new(move |state: State| {
                                                    A::on_navigate(state, url_str.clone())
                                                }));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
                    as Box<dyn FnMut(web_sys::Event)>);

                let _ = Reflect::apply(
                    &Reflect::get(&navigation, &JsValue::from_str("addEventListener"))
                        .unwrap()
                        .unchecked_into::<js_sys::Function>(),
                    &navigation,
                    &js_sys::Array::of2(&JsValue::from_str("navigate"), on_navigate.as_ref()),
                );
                on_navigate.forget();
            }
        }

        // --- 2. Fallback or standard Click Event Interception (for browsers without modern Navigation API) ---
        // Also helps with normal clicks where `navigate` doesn't fire as expected or `preventDefault` blocks URL updates.
        let dispatch_for_click = Rc::clone(&dispatch_impl);
        let on_click = Closure::wrap(Box::new(move |event: web_sys::MouseEvent| {
            // Ignore clicks with modifiers (Ctrl, Cmd, Shift, Alt)
            if event.ctrl_key() || event.meta_key() || event.shift_key() || event.alt_key() {
                return;
            }
            // Ignore right clicks
            if event.button() != 0 {
                return;
            }

            // Find closest 'a' tag
            let mut target = event
                .target()
                .map(|t| t.unchecked_into::<web_sys::Element>());
            while let Some(el) = target {
                if el.tag_name().eq_ignore_ascii_case("a") {
                    if let Some(href) = el.get_attribute("href") {
                        // Check if it's an internal link (e.g. starts with /)
                        if href.starts_with("/") && !href.starts_with("//") {
                            event.prevent_default();
                            let dispatch = Rc::clone(&dispatch_for_click);
                            let href_clone = href.clone();
                            // Update history API manually since we intercepted the click
                            if let Some(window) = web_sys::window() {
                                if let Ok(history) = window.history() {
                                    let _ = history.push_state_with_url(
                                        &JsValue::NULL,
                                        "",
                                        Some(&href_clone),
                                    );
                                }
                            }
                            dispatch(Box::new(move |state: State| {
                                // Provide the full URL to on_navigate, or just the path if on_navigate handles it.
                                // definy-client uses web_sys::Url::new, so we need a full URL
                                let full_url =
                                    web_sys::window().unwrap().location().origin().unwrap()
                                        + &href_clone;
                                A::on_navigate(state, full_url)
                            }));
                        }
                    }
                    break;
                }
                target = el.parent_element();
            }
        }) as Box<dyn FnMut(web_sys::MouseEvent)>);

        if let Some(document) = window.document() {
            let _ = document
                .add_event_listener_with_callback("click", on_click.as_ref().unchecked_ref());
        }
        on_click.forget();

        // --- 3. Handle popstate (Back/Forward buttons) ---
        let dispatch_for_pop = Rc::clone(&dispatch_impl);
        let on_popstate = Closure::wrap(Box::new(move |_event: web_sys::PopStateEvent| {
            let dispatch = Rc::clone(&dispatch_for_pop);
            let url = web_sys::window().unwrap().location().href().unwrap();
            dispatch(Box::new(move |state: State| {
                A::on_navigate(state, url.clone())
            }));
        }) as Box<dyn FnMut(web_sys::PopStateEvent)>);

        let _ = window
            .add_event_listener_with_callback("popstate", on_popstate.as_ref().unchecked_ref());
        on_popstate.forget();
    }

    apply(&html_element.into(), &first_patches, &dispatch_impl);
}

pub fn apply<State: 'static>(
    root: &web_sys::Node,
    patches: &Vec<(Vec<usize>, diff::Patch<State>)>,
    dispatch: &Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)>,
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

fn apply_patch<State: 'static>(
    node: web_sys::Node,
    patch: &diff::Patch<State>,
    dispatch: &Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)>,
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
        diff::Patch::AddStyles(styles) => {
            if let Some(element) = node.dyn_ref::<web_sys::HtmlElement>() {
                let style = element.style();
                for (key, value) in styles.iter() {
                    style.set_property(key, value).unwrap();
                }
            }
        }
        diff::Patch::RemoveStyles(keys) => {
            if let Some(element) = node.dyn_ref::<web_sys::HtmlElement>() {
                let style = element.style();
                for key in keys {
                    style.remove_property(key).unwrap();
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
                        // For form submit events, call preventDefault
                        if event_name_clone == "submit" {
                            event.prevent_default();
                        }
                        let dispatch = Rc::clone(&dispatch);
                        let fut = handler(Box::new(move |update_fn| {
                            dispatch(update_fn);
                        }));
                        wasm_bindgen_futures::spawn_local(fut);
                    })
                        as Box<dyn FnMut(web_sys::Event)>);
                    element
                        .add_event_listener_with_callback(
                            &event_name,
                            closure.as_ref().unchecked_ref(),
                        )
                        .unwrap();

                    let key = format!("__narumincho_event_{}", event_name);
                    Reflect::set(element, &JsValue::from_str(&key), closure.as_ref()).unwrap();
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
                            element
                                .remove_event_listener_with_callback(&event_name, func)
                                .unwrap();
                        }
                        Reflect::delete_property(element, &JsValue::from_str(&key)).unwrap();
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

fn create_web_sys_node<State: 'static>(
    vdom: &Node<State>,
    dispatch: &Rc<dyn Fn(Box<dyn FnOnce(State) -> State>)>,
    callback_key_symbol: &js_sys::Symbol,
) -> web_sys::Node {
    match vdom {
        Node::Element(el) => {
            let element = DOCUMENT.create_element(&el.element_name).unwrap();
            for (key, value) in &el.attributes {
                element.set_attribute(key, value).unwrap();
            }
            if let Some(html_element) = element.dyn_ref::<web_sys::HtmlElement>() {
                let style = html_element.style();
                for (key, value) in el.styles.iter() {
                    style.set_property(key, value).unwrap();
                }
            }
            for (event_name, msg) in &el.events {
                let handler = Rc::clone(&msg.handler);
                let dispatch = Rc::clone(dispatch);
                let event_name_clone = event_name.clone();
                let closure = Closure::wrap(Box::new(move |event: web_sys::Event| {
                    // For form submit events, call preventDefault
                    if event_name_clone == "submit" {
                        event.prevent_default();
                    }
                    let dispatch = Rc::clone(&dispatch);
                    let fut = handler(Box::new(move |update_fn| {
                        dispatch(update_fn);
                    }));
                    wasm_bindgen_futures::spawn_local(fut);
                }) as Box<dyn FnMut(web_sys::Event)>);
                element
                    .add_event_listener_with_callback(&event_name, closure.as_ref().unchecked_ref())
                    .unwrap();
                let key = format!("__narumincho_event_{}", event_name);
                Reflect::set(&element, &JsValue::from_str(&key), closure.as_ref()).unwrap();
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
