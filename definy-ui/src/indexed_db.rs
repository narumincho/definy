use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;

const DB_NAME: &str = "definy";
const DB_VERSION: u32 = 1;
const EVENTS_STORE: &str = "events";

pub async fn store_events(events: &[([u8; 32], Vec<u8>)]) -> Result<(), JsValue> {
    if events.is_empty() {
        return Ok(());
    }

    let db = open_db().await?;
    let transaction = db.transaction_with_str_and_mode(EVENTS_STORE, web_sys::IdbTransactionMode::Readwrite)?;
    let store = transaction.object_store(EVENTS_STORE)?;

    for (hash, bytes) in events {
        let key = JsValue::from_str(&crate::hash_format::encode_hash32(hash));
        let value = js_sys::Uint8Array::from(bytes.as_slice());
        store.put_with_key(&value, &key)?;
    }

    Ok(())
}

async fn open_db() -> Result<web_sys::IdbDatabase, JsValue> {
    let factory = web_sys::window()
        .ok_or_else(|| JsValue::from_str("missing window"))?
        .indexed_db()?
        .ok_or_else(|| JsValue::from_str("indexedDB not available"))?;

    let request = factory.open_with_u32(DB_NAME, DB_VERSION)?;

    let upgrade_request = request.clone();
    let on_upgrade = Closure::wrap(Box::new(move |_event: web_sys::IdbVersionChangeEvent| {
        if let Ok(result) = upgrade_request.result() {
            if let Ok(db) = result.dyn_into::<web_sys::IdbDatabase>() {
                let _ = db.create_object_store(EVENTS_STORE);
            }
        }
    }) as Box<dyn FnMut(_)>);
    request.set_onupgradeneeded(Some(on_upgrade.as_ref().unchecked_ref()));
    on_upgrade.forget();

    let success_request = request.clone();
    let error_request = request.clone();
    let promise = js_sys::Promise::new(&mut |resolve, reject| {
        let on_success = Closure::once(Box::new(move |_event: web_sys::Event| {
            match success_request.result() {
                Ok(result) => match result.dyn_into::<web_sys::IdbDatabase>() {
                    Ok(db) => {
                        let _ = resolve.call1(&JsValue::NULL, &db);
                    }
                    Err(error) => {
                        let _ = reject.call1(&JsValue::NULL, &error);
                    }
                },
                Err(error) => {
                    let _ = reject.call1(&JsValue::NULL, &error);
                }
            }
        }) as Box<dyn FnOnce(_)>);
        success_request.set_onsuccess(Some(on_success.as_ref().unchecked_ref()));
        on_success.forget();

        let on_error = Closure::once(Box::new(move |_event: web_sys::Event| {
            let _ = reject.call1(&JsValue::NULL, &JsValue::from_str("indexedDB open failed"));
        }) as Box<dyn FnOnce(_)>);
        error_request.set_onerror(Some(on_error.as_ref().unchecked_ref()));
        on_error.forget();
    });

    let db = JsFuture::from(promise).await?;
    db.dyn_into::<web_sys::IdbDatabase>()
}
