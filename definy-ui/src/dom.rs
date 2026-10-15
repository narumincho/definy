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

/// イベントハンドラの処理が終わってから `f` を実行する (マイクロタスク).
///
/// ハンドラの中で同期的に `focus()` や `click()` を呼ぶと, その場で focus / click イベントが起き,
/// Dioxus のイベント処理が入れ子になる. DOM を操作してイベントを起こす処理はこれを通して遅らせる.
/// setTimeout ではなくマイクロタスクにするのは, 素早く続けて押された次のキーより先にフォーカスを移すため
pub fn defer(f: impl FnOnce() + 'static) {
    #[cfg(target_arch = "wasm32")]
    {
        let callback = wasm_bindgen::closure::Closure::once(move |_: wasm_bindgen::JsValue| f());
        let _ = js_sys::Promise::resolve(&wasm_bindgen::JsValue::NULL).then(&callback);
        // 一度だけ呼ばれるので, 呼ばれた後に解放されるよう JS 側に渡す
        callback.forget();
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = f;
    }
}

fn html_element_by_selector(selector: &str) -> Option<web_sys::HtmlElement> {
    web_sys::window()?
        .document()?
        .query_selector(selector)
        .ok()
        .flatten()
        .and_then(|element| wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlElement>(element).ok())
}

/// セレクタに一致する最初の要素に (イベント処理の後で) フォーカスする.
/// 見つからなければ `fallback_selector` の要素にフォーカスする
pub fn focus_first(selector: &str) {
    focus_first_or(selector, None);
}

pub fn focus_first_or(selector: &str, fallback_selector: Option<&str>) {
    let selector = selector.to_string();
    let fallback_selector = fallback_selector.map(str::to_string);
    defer(move || {
        let element = html_element_by_selector(&selector).or_else(|| {
            fallback_selector
                .as_deref()
                .and_then(html_element_by_selector)
        });
        if let Some(element) = element {
            let _ = element.focus();
        }
    });
}

/// セレクタに一致する最初の要素を (イベント処理の後で) クリックする
pub fn click_first(selector: &str) {
    let selector = selector.to_string();
    defer(move || {
        if let Some(element) = html_element_by_selector(&selector) {
            element.click();
        }
    });
}

/// フォーカスされている要素の ID (なければ空文字列)
pub fn active_element_id() -> String {
    web_sys::window()
        .and_then(|window| window.document())
        .and_then(|document| document.active_element())
        .map(|element| element.id())
        .unwrap_or_default()
}

/// 要素が見える位置までスクロールする (すでに見えていれば動かさない)
pub fn scroll_into_view_nearest(selector: &str) {
    if let Some(element) = html_element_by_selector(selector) {
        let options = web_sys::ScrollIntoViewOptions::new();
        options.set_block(web_sys::ScrollLogicalPosition::Nearest);
        element.scroll_into_view_with_scroll_into_view_options(&options);
    }
}
