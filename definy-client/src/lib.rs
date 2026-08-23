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

impl narumincho_vdom_client::App<AppState> for DefinyApp {
    fn initial_state(
        fire: &std::rc::Rc<dyn Fn(Box<dyn FnOnce(AppState) -> AppState>)>,
    ) -> AppState {
        let fire = std::rc::Rc::clone(fire);
        let ssr_state = read_ssr_state();

        let fire_for_keydown = std::rc::Rc::clone(&fire);
        let on_keydown =
            wasm_bindgen::closure::Closure::wrap(Box::new(move |event: web_sys::KeyboardEvent| {
                let key = event.key();
                let fire = std::rc::Rc::clone(&fire_for_keydown);
                fire(Box::new(move |state| {
                    keyboard_nav::handle_keydown(state, key)
                }));
            })
                as Box<dyn FnMut(web_sys::KeyboardEvent)>);
        web_sys::window()
            .unwrap()
            .add_event_listener_with_callback("keydown", on_keydown.as_ref().unchecked_ref())
            .unwrap();
        on_keydown.forget();

        let query_string = {
            let initial_url = web_sys::window()
                .unwrap()
                .document()
                .unwrap()
                .url()
                .unwrap_or_default();
            let url = web_sys::Url::new(&initial_url).unwrap();
            let search = url.search();
            search
                .strip_prefix('?')
                .unwrap_or(search.as_str())
                .to_string()
        };

        let query_params = definy_ui::query::parse_query(Some(query_string.as_str()));
        let filter_for_fetch = query_params.event_type;

        let has_more = if let Some(ref ssr) = ssr_state {
            ssr.has_more
        } else {
            true
        };

        let ssr_state_for_async = read_ssr_state();
        wasm_bindgen_futures::spawn_local(async move {
            if let Some(decoded_ssr_state) = ssr_state_for_async.as_ref() {
                let _ =
                    definy_ui::indexed_db::store_events(&decoded_ssr_state.event_binaries).await;
            }
            if ssr_state_for_async.is_none() {
                if let Ok(cached_event_binaries) =
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
                let events = definy_ui::fetch::get_events(filter_for_fetch, Some(20), Some(0))
                    .await
                    .unwrap();
                fire(Box::new(move |state| {
                    let mut event_cache = state.event_cache.clone();
                    let mut event_hashes = Vec::new();
                    for (hash, event) in &events {
                        event_cache.insert(hash.clone(), event.clone());
                        event_hashes.push(hash.clone());
                    }
                    AppState {
                        event_cache,
                        event_list_state: definy_ui::EventListState {
                            event_hashes,
                            current_offset: 0,
                            page_size: 20,
                            is_loading: false,
                            has_more: events.len() == 20,
                            filter_event_type: filter_for_fetch,
                        },
                        ..state.clone()
                    }
                }));
            }
            let password = definy_ui::navigator_credential::credential_get().await;
            if let Some(password) = password {
                fire(Box::new(move |state| AppState {
                    current_key: Some(password),
                    ..state.clone()
                }));
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
        )
    }

    fn title(state: &AppState, url: &web_sys::Url) -> String {
        let browser_lang = definy_ui::language::best_language_from_browser();
        let context = definy_ui::PageContext::from_path_and_query(
            &url.pathname(),
            &url.search(),
            browser_lang.map(|l| l.to_code()),
        );
        definy_ui::document_title_text(state, &context)
    }

    fn render(state: &AppState, url: &web_sys::Url) -> narumincho_vdom::Node {
        let browser_lang = definy_ui::language::best_language_from_browser();
        let context = definy_ui::PageContext::from_path_and_query(
            &url.pathname(),
            &url.search(),
            browser_lang.map(|l| l.to_code()),
        );
        definy_ui::render(state, &context)
    }
}
