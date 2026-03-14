use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;

const DB_NAME: &str = "definy";
const DB_VERSION: u32 = 2;
const EVENTS_STORE: &str = "events";
const EVENT_SEND_QUEUE_STORE: &str = "event_send_queue";

pub async fn store_events(events: &[([u8; 32], Vec<u8>)]) -> Result<(), JsValue> {
    if events.is_empty() {
        return Ok(());
    }

    let db = open_db().await?;
    let transaction =
        db.transaction_with_str_and_mode(EVENTS_STORE, web_sys::IdbTransactionMode::Readwrite)?;
    let store = transaction.object_store(EVENTS_STORE)?;

    for (hash, bytes) in events {
        let key = JsValue::from_str(&crate::hash_format::encode_hash32(hash));
        let value = js_sys::Uint8Array::from(bytes.as_slice());
        store.put_with_key(&value, &key)?;
    }

    Ok(())
}

pub async fn load_event_binaries() -> Result<Vec<Vec<u8>>, JsValue> {
    let db = open_db().await?;
    let transaction = db.transaction_with_str(EVENTS_STORE)?;
    let store = transaction.object_store(EVENTS_STORE)?;
    let request = store.get_all()?;
    let value = request_to_jsvalue(request).await?;
    let array = js_sys::Array::from(&value);
    let mut events = Vec::new();
    for value in array.iter() {
        let bytes = js_sys::Uint8Array::new(&value).to_vec();
        events.push(bytes);
    }
    Ok(events)
}

pub async fn store_event_send_record(
    record: &crate::local_event::LocalEventRecord,
) -> Result<(), JsValue> {
    let db = open_db().await?;
    let transaction = db.transaction_with_str_and_mode(
        EVENT_SEND_QUEUE_STORE,
        web_sys::IdbTransactionMode::Readwrite,
    )?;
    let store = transaction.object_store(EVENT_SEND_QUEUE_STORE)?;

    let key = JsValue::from_str(&crate::hash_format::encode_hash32(&record.hash));
    let value = serde_cbor::to_vec(record).map_err(|error| JsValue::from_str(&format!("{error:?}")))?;
    let value = js_sys::Uint8Array::from(value.as_slice());
    let request = store.put_with_key(&value, &key)?;
    let _ = request_to_jsvalue(request).await?;
    Ok(())
}

pub async fn remove_event_send_record(hash: &[u8; 32]) -> Result<(), JsValue> {
    let db = open_db().await?;
    let transaction = db.transaction_with_str_and_mode(
        EVENT_SEND_QUEUE_STORE,
        web_sys::IdbTransactionMode::Readwrite,
    )?;
    let store = transaction.object_store(EVENT_SEND_QUEUE_STORE)?;
    let key = JsValue::from_str(&crate::hash_format::encode_hash32(hash));
    let request = store.delete(&key)?;
    let _ = request_to_jsvalue(request).await?;
    Ok(())
}

pub async fn load_event_send_records() -> Result<Vec<crate::local_event::LocalEventRecord>, JsValue> {
    let db = open_db().await?;
    let transaction = db.transaction_with_str(EVENT_SEND_QUEUE_STORE)?;
    let store = transaction.object_store(EVENT_SEND_QUEUE_STORE)?;
    let request = store.get_all()?;
    let value = request_to_jsvalue(request).await?;
    let array = js_sys::Array::from(&value);
    let mut records = Vec::new();
    for value in array.iter() {
        let bytes = js_sys::Uint8Array::new(&value).to_vec();
        if let Ok(record) = serde_cbor::from_slice::<crate::local_event::LocalEventRecord>(&bytes) {
            records.push(record);
        }
    }
    Ok(records)
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
                let store_names = db.object_store_names();
                let mut has_events = false;
                let mut has_queue = false;
                for index in 0..store_names.length() {
                    if let Some(name) = store_names.get(index) {
                        if name == EVENTS_STORE {
                            has_events = true;
                        }
                        if name == EVENT_SEND_QUEUE_STORE {
                            has_queue = true;
                        }
                    }
                }
                if !has_events {
                    let _ = db.create_object_store(EVENTS_STORE);
                }
                if !has_queue {
                    let _ = db.create_object_store(EVENT_SEND_QUEUE_STORE);
                }
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

async fn request_to_jsvalue(request: web_sys::IdbRequest) -> Result<JsValue, JsValue> {
    let success_request = request.clone();
    let error_request = request.clone();
    let promise = js_sys::Promise::new(&mut |resolve, reject| {
        let on_success = Closure::once(Box::new(move |_event: web_sys::Event| {
            match success_request.result() {
                Ok(result) => {
                    let _ = resolve.call1(&JsValue::NULL, &result);
                }
                Err(error) => {
                    let _ = reject.call1(&JsValue::NULL, &error);
                }
            }
        }) as Box<dyn FnOnce(_)>);
        success_request.set_onsuccess(Some(on_success.as_ref().unchecked_ref()));
        on_success.forget();

        let on_error = Closure::once(Box::new(move |_event: web_sys::Event| {
            let _ = reject.call1(&JsValue::NULL, &JsValue::from_str("indexedDB request failed"));
        }) as Box<dyn FnOnce(_)>);
        error_request.set_onerror(Some(on_error.as_ref().unchecked_ref()));
        on_error.forget();
    });

    JsFuture::from(promise).await
}
