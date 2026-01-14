#[wasm_bindgen::prelude::wasm_bindgen(start)]
fn run() -> Result<(), wasm_bindgen::JsValue> {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");
    let body = document.body().expect("document should have a body");

    let val = document.create_element("p")?;
    val.set_text_content(Some("Hello from Rust!"));

    body.append_child(&val)?;

    narumincho_vdom_client::render(&definy_ui::app());

    Ok(())
}
