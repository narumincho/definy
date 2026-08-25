use definy_event::EventHashId;
use definy_ui::AppState;
use dioxus::prelude::*;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

mod keyboard_nav;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    dioxus::launch(AppRoot);
    Ok(())
}

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

fn get_current_page_context() -> definy_ui::PageContext {
    let window = web_sys::window();
    let pathname = window
        .as_ref()
        .and_then(|w| w.location().pathname().ok())
        .unwrap_or_else(|| "/".to_string());
    let search = window
        .as_ref()
        .and_then(|w| w.location().search().ok())
        .unwrap_or_default();
    let browser_lang = definy_ui::language::best_language_from_browser();
    definy_ui::PageContext::from_path_and_query(
        &pathname,
        &search,
        browser_lang.map(|l| l.to_code()),
    )
}

async fn sleep_ms(ms: i32) {
    let promise = js_sys::Promise::new(&mut |resolve, _| {
        if let Some(window) = web_sys::window() {
            let _ = window.set_timeout_with_callback_and_timeout_and_arguments_0(&resolve, ms);
        }
    });
    let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
}

#[component]
fn AppRoot() -> Element {
    let mut state_signal = use_signal(|| {
        let search_query = web_sys::window()
            .and_then(|w| w.location().search().ok())
            .unwrap_or_default();
        let query_params = definy_ui::query::parse_query(Some(search_query.as_str()));
        let filter_for_fetch = query_params.event_type;

        let ssr_state = read_ssr_state();
        let has_more = ssr_state.as_ref().is_none_or(|s| s.has_more);
        let is_db_connected = ssr_state.as_ref().is_none_or(|s| s.is_db_connected);
        let has_ssr_state = ssr_state.is_some();

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
    });

    use_context_provider(|| state_signal);

    let current_context = use_signal(get_current_page_context);

    // Initial setup on mount
    use_effect(move || {
        let ssr_state = read_ssr_state();
        let search_query = web_sys::window()
            .and_then(|w| w.location().search().ok())
            .unwrap_or_default();
        let query_params = definy_ui::query::parse_query(Some(search_query.as_str()));
        let filter_for_fetch = query_params.event_type;

        // Keydown listener
        setup_keydown_listener(state_signal);

        // Click listener for client-side navigation
        setup_click_listener(current_context, state_signal);

        // Popstate listener for back/forward navigation
        setup_popstate_listener(current_context, state_signal);

        // Spawn initial async tasks
        spawn(async move {
            if let Some(key) = definy_ui::navigator_credential::credential_get_sync() {
                state_signal.write().current_key = Some(key);
            } else if let Some(password) = definy_ui::navigator_credential::credential_get().await {
                state_signal.write().current_key = Some(password);
            }

            if let Some(decoded_ssr_state) = ssr_state.as_ref() {
                let _ =
                    definy_ui::indexed_db::store_events(&decoded_ssr_state.event_binaries).await;
            } else if let Ok(cached_event_binaries) =
                definy_ui::indexed_db::load_event_binaries().await
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
                let mut next = state_signal.read().clone();
                for (hash, event) in &cached_events {
                    next.event_cache.insert(hash.clone(), event.clone());
                    next.event_list_state.event_hashes.push(hash.clone());
                }
                next.event_list_state.is_loading = true;
                state_signal.set(next);
            }

            match definy_ui::fetch::get_events(filter_for_fetch, Some(20), Some(0)).await {
                Ok(events) => {
                    let events_count = events.len();
                    let mut next = state_signal.read().clone();
                    next.is_db_connected = true;
                    next.apply_latest_events(events, filter_for_fetch);
                    next.event_list_state.is_loading = false;
                    next.event_list_state.has_more = events_count == 20;
                    state_signal.set(next);
                }
                Err(_) => {
                    let mut next = state_signal.read().clone();
                    next.is_db_connected = false;
                    next.event_list_state.is_loading = false;
                    state_signal.set(next);
                }
            }

            let local_events = definy_ui::indexed_db::load_event_records().await;
            let mut next = state_signal.read().clone();
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
            state_signal.set(next);
        });

        // Spawn DB reconnect poller
        spawn(async move {
            loop {
                sleep_ms(5000).await;
                let filter = state_signal.read().event_list_state.filter_event_type;
                match definy_ui::fetch::get_events(filter, Some(20), Some(0)).await {
                    Ok(events) => {
                        let events_count = events.len();
                        let mut next = state_signal.read().clone();
                        let was_disconnected = !next.is_db_connected;
                        next.is_db_connected = true;
                        if was_disconnected || next.event_list_state.event_hashes.is_empty() {
                            next.apply_latest_events(events, filter);
                            next.event_list_state.is_loading = false;
                            next.event_list_state.has_more = events_count == 20;
                        }
                        state_signal.set(next);
                    }
                    Err(_) => {
                        let mut next = state_signal.read().clone();
                        next.is_db_connected = false;
                        state_signal.set(next);
                    }
                }
            }
        });
    });

    // Update document title when state or route changes
    let state_val = state_signal.read().clone();
    let ctx_val = current_context.read().clone();
    let title_text = definy_ui::document_title_text(&state_val, &ctx_val);
    if let Some(doc) = web_sys::window().and_then(|w| w.document()) {
        doc.set_title(&title_text);
    }

    // Check if current route requires data that might be missing in cache
    if let Some(location) = &ctx_val.location {
        let is_missing = match location {
            definy_ui::Location::Part(hash) => !state_val.event_cache.contains_key(hash),
            definy_ui::Location::Event(hash) => !state_val.event_cache.contains_key(hash),
            definy_ui::Location::Module(hash) => !state_val.event_cache.contains_key(hash),
            definy_ui::Location::Home => {
                state_val.event_cache.is_empty()
                    || state_val.event_list_state.event_hashes.is_empty()
            }
            definy_ui::Location::PartList | definy_ui::Location::ModuleList => {
                state_val.event_cache.is_empty()
            }
            _ => false,
        };
        if is_missing {
            fetch_missing_events(state_signal, &ctx_val);
        }
    }

    rsx! {
        definy_ui::App {
            state: state_val,
            context: ctx_val,
        }
    }
}

fn fetch_missing_events(mut state_signal: Signal<AppState>, context: &definy_ui::PageContext) {
    let context = context.clone();
    spawn(async move {
        match &context.location {
            Some(definy_ui::Location::Part(hash))
            | Some(definy_ui::Location::Event(hash))
            | Some(definy_ui::Location::Module(hash)) => {
                let hash = hash.clone();
                if let Ok(Some((event_hash, event))) = definy_ui::fetch::get_event(&hash).await {
                    state_signal.write().event_cache.insert(event_hash, event);
                }
            }
            Some(definy_ui::Location::PartList)
            | Some(definy_ui::Location::ModuleList)
            | Some(definy_ui::Location::Home) => {
                let filter = context.filter_event_type;
                if let Ok(events) = definy_ui::fetch::get_events(filter, Some(100), Some(0)).await {
                    let events_count = events.len();
                    let mut next = state_signal.read().clone();
                    next.is_db_connected = true;
                    if filter.is_none() || next.event_list_state.event_hashes.is_empty() {
                        next.apply_latest_events(events, filter);
                        next.event_list_state.is_loading = false;
                        next.event_list_state.has_more = events_count == 100;
                    } else {
                        for (hash, event) in events {
                            next.event_cache.insert(hash, event);
                        }
                    }
                    next_state_ensure_cache(&mut next);
                    state_signal.set(next);
                }
            }
            _ => {}
        }
    });
}

fn next_state_ensure_cache(state: &mut AppState) {
    let missing_hashes: Vec<_> = state
        .event_cache
        .values()
        .filter_map(|ev| match ev {
            Ok((_, event)) => match &event.content {
                definy_event::event::EventContent::PartUpdate(u) => {
                    Some(u.part_definition_event_hash.clone())
                }
                definy_event::event::EventContent::ModuleUpdate(u) => {
                    Some(u.module_definition_event_hash.clone())
                }
                _ => None,
            },
            _ => None,
        })
        .filter(|h| !state.event_cache.contains_key(h))
        .collect();

    for hash in missing_hashes {
        spawn(async move {
            let _ = definy_ui::fetch::get_event(&hash).await;
        });
    }
}

fn setup_keydown_listener(mut state_signal: Signal<AppState>) {
    let on_keydown =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |event: web_sys::KeyboardEvent| {
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

            let next = keyboard_nav::handle_keydown(state_signal.read().clone(), key);
            state_signal.set(next);
        }) as Box<dyn FnMut(web_sys::KeyboardEvent)>);

    if let Some(window) = web_sys::window() {
        let _ =
            window.add_event_listener_with_callback("keydown", on_keydown.as_ref().unchecked_ref());
    }
    on_keydown.forget();
}

fn setup_click_listener(
    mut context_signal: Signal<definy_ui::PageContext>,
    state_signal: Signal<AppState>,
) {
    let on_click =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |event: web_sys::MouseEvent| {
            // Only handle primary clicks without modifier keys
            if event.button() != 0
                || event.meta_key()
                || event.ctrl_key()
                || event.shift_key()
                || event.alt_key()
            {
                return;
            }

            let target = match event.target() {
                Some(t) => t,
                None => return,
            };

            // Traverse up to find <a> tag
            let mut current_element = target.dyn_into::<web_sys::Element>().ok();
            let mut anchor: Option<web_sys::HtmlAnchorElement> = None;

            while let Some(el) = current_element {
                if let Ok(a) = el.clone().dyn_into::<web_sys::HtmlAnchorElement>() {
                    anchor = Some(a);
                    break;
                }
                current_element = el.parent_element();
            }

            let Some(a) = anchor else {
                return;
            };

            // Don't intercept target="_blank" or download links
            if a.target() == "_blank" || a.has_attribute("download") {
                return;
            }

            let href = a.get_attribute("href").unwrap_or_default();
            if !href.starts_with('/') || href.starts_with("//") {
                return;
            }

            event.prevent_default();

            if let Some(window) = web_sys::window() {
                if let Ok(history) = window.history() {
                    let _ = history.push_state_with_url(&JsValue::NULL, "", Some(&href));
                }
            }

            let ctx = get_current_page_context();
            context_signal.set(ctx.clone());
            fetch_missing_events(state_signal, &ctx);
        }) as Box<dyn FnMut(web_sys::MouseEvent)>);

    if let Some(window) = web_sys::window()
        && let Some(document) = window.document()
    {
        let _ =
            document.add_event_listener_with_callback("click", on_click.as_ref().unchecked_ref());
    }
    on_click.forget();
}

fn setup_popstate_listener(
    mut context_signal: Signal<definy_ui::PageContext>,
    state_signal: Signal<AppState>,
) {
    let on_popstate =
        wasm_bindgen::closure::Closure::wrap(Box::new(move |_: web_sys::PopStateEvent| {
            let ctx = get_current_page_context();
            context_signal.set(ctx.clone());
            fetch_missing_events(state_signal, &ctx);
        }) as Box<dyn FnMut(web_sys::PopStateEvent)>);

    if let Some(window) = web_sys::window() {
        let _ = window
            .add_event_listener_with_callback("popstate", on_popstate.as_ref().unchecked_ref());
    }
    on_popstate.forget();
}
