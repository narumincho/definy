use std::{cell::RefCell, rc::Rc};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    let state = Rc::new(RefCell::new(0));
    let vdom = Rc::new(RefCell::new(definy_ui::app(*state.borrow())));

    narumincho_vdom_client::render(&vdom.borrow());

    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");

    let closure = Closure::<dyn FnMut(_)>::new({
        let state = state.clone();
        let vdom = vdom.clone();
        let document = document.clone();
        move |event: web_sys::Event| {
            let target = event
                .target()
                .expect("event should have a target")
                .dyn_into::<web_sys::Element>();

            if let Ok(element) = target {
                if let Some(command) = element.get_attribute("command") {
                    if command == "increment" {
                        *state.borrow_mut() += 1;
                        let new_vdom = definy_ui::app(*state.borrow());
                        let patches = narumincho_vdom::diff(&vdom.borrow(), &new_vdom);
                        narumincho_vdom_client::apply(&document, patches);
                        *vdom.borrow_mut() = new_vdom;
                    }
                }
            }
        }
    });

    window.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;

    closure.forget();

    Ok(())
}
