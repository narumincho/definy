use std::{cell::RefCell, rc::Rc};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    let state = Rc::new(RefCell::new(definy_ui::AppState {
        count: 0,
        generated_key: None,
        generated_public_key: None,
    }));
    let vdom = Rc::new(RefCell::new(definy_ui::app(state.borrow().clone())));

    narumincho_vdom_client::render(&vdom.borrow());

    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");

    let closure = Closure::<dyn FnMut(_)>::new({
        let state = state.clone();
        let vdom = vdom.clone();
        let document = document.clone();
        let window = window.clone();
        move |event: web_sys::Event| {
            let target = event
                .target()
                .expect("event should have a target")
                .dyn_into::<web_sys::Element>();

            if let Ok(element) = target {
                if let Some(command) = element.get_attribute("command") {
                    if command == "increment" {
                        state.borrow_mut().count += 1;
                    } else if command == "show-modal" || command == "regenerate-key" {
                        let mut csprng = rand::rngs::OsRng;
                        let signing_key: ed25519_dalek::SigningKey =
                            ed25519_dalek::SigningKey::generate(&mut csprng);
                        let secret = signing_key.to_bytes();
                        let public = signing_key.verifying_key().to_bytes();

                        use base64::{Engine as _, engine::general_purpose};
                        let encoded_secret = general_purpose::URL_SAFE_NO_PAD.encode(secret);
                        let encoded_public = general_purpose::URL_SAFE_NO_PAD.encode(public);

                        state.borrow_mut().generated_key = Some(encoded_secret);
                        state.borrow_mut().generated_public_key = Some(encoded_public);
                    } else if command == "copy-private-key" {
                        if let Some(key) = &state.borrow().generated_key {
                            let navigator = window.navigator();
                            let clipboard: web_sys::Clipboard = navigator.clipboard();
                            let _ = clipboard.write_text(key);
                        }
                    }

                    match command.as_str() {
                        "increment" | "show-modal" | "regenerate-key" => {
                            let new_vdom = definy_ui::app(state.borrow().clone());
                            let patches = narumincho_vdom::diff(&vdom.borrow(), &new_vdom);
                            let root = document
                                .document_element()
                                .expect("should have a document element");
                            narumincho_vdom_client::apply(&root, patches);
                            *vdom.borrow_mut() = new_vdom;
                        }
                        _ => {}
                    }
                }
            }
        }
    });

    window.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;

    closure.forget();

    Ok(())
}
