#[wasm_bindgen::prelude::wasm_bindgen(start)]
fn run() -> Result<(), wasm_bindgen::JsValue> {
    narumincho_vdom_client::render(&definy_ui::app());

    Ok(())
}
