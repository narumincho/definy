pub fn get_input_value(selector: &str) -> String {
    web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.query_selector(selector).ok())
        .flatten()
        .and_then(|element| {
            wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(element).ok()
        })
        .map(|input| input.value())
        .unwrap_or_default()
}

pub fn get_textarea_value(selector: &str) -> String {
    web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.query_selector(selector).ok())
        .flatten()
        .and_then(|element| {
            wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlTextAreaElement>(element).ok()
        })
        .map(|textarea| textarea.value())
        .unwrap_or_default()
}
