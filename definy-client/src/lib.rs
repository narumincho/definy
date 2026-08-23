use definy_event::EventHashId;
use definy_ui::AppState;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    narumincho_vdom_client::start::<AppState, DefinyApp>();

    Ok(())
}

mod keyboard_nav;
struct DefinyApp {}

static SSR_INITIAL_STATE_TEXT: std::sync::LazyLock<Option<String>> =
    std::sync::LazyLock::new(read_ssr_initial_state_text);

fn read_ssr_initial_state_text() -> Option<String> {
    web_sys::window()?
        .document()?
        .get_element_by_id(definy_ui::SSR_INITIAL_STATE_ELEMENT_ID)?
        .text_content()
}

fn read_ssr_state() -> Option<definy_ui::SsrState> {
    let text = SSR_INITIAL_STATE_TEXT.as_ref()?.to_string();
    definy_ui::decode_ssr_state(text.as_str())
}

fn get_page_context(url: &web_sys::Url) -> definy_ui::PageContext {
    let browser_lang = definy_ui::language::best_language_from_browser();
    definy_ui::PageContext::from_path_and_query(
        &url.pathname(),
        &url.search(),
        browser_lang.map(|l| l.to_code()),
    )
}

type StateUpdater = std::rc::Rc<dyn Fn(Box<dyn FnOnce(AppState) -> AppState>)>;

fn setup_keydown_listener(fire: &StateUpdater) {
    let fire_for_keydown = std::rc::Rc::clone(fire);
    let on_keydown =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |event: web_sys::KeyboardEvent| {
            // Safely read the "key" property to avoid passStringToWasm0 crash
            // when event.key is undefined (e.g. during synthetic/autofocus events)
            let key_value = js_sys::Reflect::get(&event, &JsValue::from_str("key")).ok();
            let key = match key_value {
                Some(v) if v.is_string() => v.as_string().unwrap(),
                _ => return,
            };

            if let Some(window) = web_sys::window()
                && let Some(document) = window.document()
                && let Some(active) = document.active_element()
            {
                let tag = active.tag_name().to_lowercase();
                if tag == "input" || tag == "textarea" {
                    return;
                }
            }

            let fire = std::rc::Rc::clone(&fire_for_keydown);
            fire(Box::new(move |state| {
                keyboard_nav::handle_keydown(state, key)
            }));
        }) as Box<dyn FnMut(web_sys::KeyboardEvent)>);

    if let Some(window) = web_sys::window() {
        let _ =
            window.add_event_listener_with_callback("keydown", on_keydown.as_ref().unchecked_ref());
    }
    on_keydown.forget();
}

async fn sleep_ms(ms: i32) {
    let promise = js_sys::Promise::new(&mut |resolve, _| {
        if let Some(window) = web_sys::window() {
            let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms);
        }
    });
    let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
}

fn spawn_initial_async_tasks(
    fire: &StateUpdater,
    ssr_state: Option<definy_ui::SsrState>,
    filter_for_fetch: Option<definy_event::event::EventType>,
) {
    let fire = std::rc::Rc::clone(fire);
    wasm_bindgen_futures::spawn_local(async move {
        if let Some(key) = definy_ui::navigator_credential::credential_get_sync() {
            fire(Box::new(move |state| AppState {
                current_key: Some(key),
                ..state.clone()
            }));
        } else if let Some(password) = definy_ui::navigator_credential::credential_get().await {
            fire(Box::new(move |state| AppState {
                current_key: Some(password),
                ..state.clone()
            }));
        }

        if let Some(decoded_ssr_state) = ssr_state.as_ref() {
            let _ = definy_ui::indexed_db::store_events(&decoded_ssr_state.event_binaries).await;
        } else if let Ok(cached_event_binaries) = definy_ui::indexed_db::load_event_binaries().await
        {
            let mut cached_events = cached_event_binaries
                .into_iter()
                .map(|bytes| {
                    let hash = EventHashId::from_bytes(&bytes);
                    let event = definy_event::verify_and_deserialize(&bytes);
                    (hash, event)
                })
                .collect::<Vec<_>>();
            cached_events.sort_by(|a, b| {
                let a_time = match &a.1 {
                    Ok((_, event)) => event.time,
                    Err(_) => chrono::DateTime::<chrono::Utc>::MIN_UTC,
                };
                let b_time = match &b.1 {
                    Ok((_, event)) => event.time,
                    Err(_) => chrono::DateTime::<chrono::Utc>::MIN_UTC,
                };
                b_time.cmp(&a_time)
            });
            fire(Box::new(move |state| {
                let mut event_cache = state.event_cache.clone();
                let mut event_hashes = Vec::new();
                for (hash, event) in &cached_events {
                    event_cache.insert(hash.clone(), event.clone());
                    event_hashes.push(hash.clone());
                }
                AppState {
                    event_cache,
                    event_list_state: definy_ui::EventListState {
                        event_hashes,
                        current_offset: 0,
                        page_size: 20,
                        is_loading: true,
                        has_more: state.event_list_state.has_more,
                        filter_event_type: state.event_list_state.filter_event_type,
                    },
                    ..state.clone()
                }
            }));
        }

        match definy_ui::fetch::get_events(filter_for_fetch, Some(20), Some(0)).await {
            Ok(events) => {
                let events_count = events.len();
                fire(Box::new(move |state| {
                    let mut next = state.clone();
                    next.is_db_connected = true;
                    next.apply_latest_events(events, filter_for_fetch);
                    next.event_list_state.is_loading = false;
                    next.event_list_state.has_more = events_count == 20;
                    next
                }));
            }
            Err(_) => {
                fire(Box::new(move |state| {
                    let mut next = state.clone();
                    next.is_db_connected = false;
                    next.event_list_state.is_loading = false;
                    next
                }));
            }
        }

        let local_events = definy_ui::indexed_db::load_event_records().await;
        fire(Box::new(move |state| {
            let mut next = state.clone();
            match local_events {
                Ok(records) => {
                    definy_ui::replace_local_event_records(&mut next, records);
                    next.local_event_queue.is_loading = false;
                    next.local_event_queue.last_error = None;
                }
                Err(error) => {
                    next.local_event_queue.is_loading = false;
                    next.local_event_queue.last_error =
                        Some(format!("Failed to load local events: {error:?}"));
                }
            }
            next
        }));
    });
}

fn spawn_db_reconnect_poller(
    fire: &StateUpdater,
    filter_for_fetch: Option<definy_event::event::EventType>,
) {
    let fire = std::rc::Rc::clone(fire);
    wasm_bindgen_futures::spawn_local(async move {
        loop {
            sleep_ms(5000).await;
            match definy_ui::fetch::get_events(filter_for_fetch, Some(20), Some(0)).await {
                Ok(events) => {
                    let events_count = events.len();
                    fire(Box::new(move |state| {
                        let mut next = state.clone();
                        let was_disconnected = !next.is_db_connected;
                        next.is_db_connected = true;
                        if was_disconnected || next.event_list_state.event_hashes.is_empty() {
                            next.apply_latest_events(events, filter_for_fetch);
                            next.event_list_state.is_loading = false;
                            next.event_list_state.has_more = events_count == 20;
                        }
                        next
                    }));
                }
                Err(_) => {
                    fire(Box::new(move |state| {
                        let mut next = state.clone();
                        next.is_db_connected = false;
                        next
                    }));
                }
            }
        }
    });
}

impl narumincho_vdom_client::App<AppState> for DefinyApp {
    fn initial_state(fire: &StateUpdater) -> AppState {
        setup_keydown_listener(fire);

        let search_query = web_sys::window()
            .and_then(|w| w.location().search().ok())
            .unwrap_or_default();
        let query_params = definy_ui::query::parse_query(Some(search_query.as_str()));
        let filter_for_fetch = query_params.event_type;

        let ssr_state = read_ssr_state();
        let has_more = ssr_state.as_ref().is_none_or(|s| s.has_more);
        let is_db_connected = ssr_state.as_ref().is_none_or(|s| s.is_db_connected);
        let has_ssr_state = ssr_state.is_some();

        spawn_initial_async_tasks(fire, ssr_state.clone(), filter_for_fetch);
        spawn_db_reconnect_poller(fire, filter_for_fetch);

        definy_ui::build_initial_state(
            ssr_state.map_or(vec![], |state| {
                state
                    .event_binaries
                    .iter()
                    .map(|bytes| {
                        (
                            EventHashId::from_bytes(bytes),
                            definy_event::verify_and_deserialize(bytes),
                        )
                    })
                    .collect()
            }),
            !has_ssr_state,
            has_more,
            None,
            filter_for_fetch,
            is_db_connected,
        )
    }

    fn title(state: &AppState, url: &web_sys::Url) -> String {
        let context = get_page_context(url);
        definy_ui::document_title_text(state, &context)
    }

    fn render(state: &AppState, url: &web_sys::Url) -> narumincho_vdom::Node {
        let context = get_page_context(url);
        definy_ui::render(state, &context)
    }
}
