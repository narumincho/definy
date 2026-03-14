use definy_ui::AppState;
use definy_ui::ResourceHash;
use wasm_bindgen::JsValue;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn run() -> Result<(), JsValue> {
    narumincho_vdom_client::start::<AppState, DefinyApp>();

    Ok(())
}

mod keyboard_nav;
struct DefinyApp {}

static SSR_RESOURCE_HASH: std::sync::LazyLock<Option<ResourceHash>> =
    std::sync::LazyLock::new(read_resource_hash_from_dom);
static SSR_INITIAL_STATE_TEXT: std::sync::LazyLock<Option<String>> =
    std::sync::LazyLock::new(read_ssr_initial_state_text);

fn read_resource_hash_from_dom() -> Option<ResourceHash> {
    let document = web_sys::window()?.document()?;
    let script = document.query_selector("script[type=\"module\"]").ok()??;
    let text = script.text_content()?;

    let js = text
        .split("import init from '/")
        .nth(1)?
        .split("';")
        .next()?;

    let wasm = text
        .split("module_or_path: \"")
        .nth(1)?
        .split('"')
        .next()?;

    Some(ResourceHash {
        js: js.to_string(),
        wasm: wasm.to_string(),
    })
}

fn read_ssr_initial_state_text() -> Option<String> {
    web_sys::window()?
        .document()?
        .get_element_by_id(definy_ui::SSR_INITIAL_STATE_ELEMENT_ID)?
        .text_content()
}

fn read_ssr_state() -> Option<(
    Vec<(
        [u8; 32],
        Result<
            (ed25519_dalek::Signature, definy_event::event::Event),
            definy_event::VerifyAndDeserializeError,
        >,
    )>,
    bool,
    Vec<Vec<u8>>,
)> {
    let text = SSR_INITIAL_STATE_TEXT.as_ref()?.to_string();
    let decoded = definy_ui::decode_ssr_state(text.as_str())?;
    let event_binaries = decoded.event_binaries;
    let events = event_binaries
        .iter()
        .map(|bytes| {
            let hash: [u8; 32] = <sha2::Sha256 as sha2::Digest>::digest(bytes).into();
            (hash, definy_event::verify_and_deserialize(bytes))
        })
        .collect();
    Some((events, decoded.has_more, event_binaries))
}

impl narumincho_vdom_client::App<AppState> for DefinyApp {
    fn initial_state(
        fire: &std::rc::Rc<dyn Fn(Box<dyn FnOnce(AppState) -> AppState>)>,
    ) -> AppState {
        let fire = std::rc::Rc::clone(fire);
        let ssr_state = read_ssr_state();
        let ssr_event_binaries = ssr_state.as_ref().map(|(_, _, binaries)| binaries.clone());
        let has_ssr_events = ssr_state.is_some();

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

        let filter_query = {
            let initial_url = web_sys::window()
                .unwrap()
                .document()
                .unwrap()
                .url()
                .unwrap_or_default();
            let url = web_sys::Url::new(&initial_url).unwrap();
            let search = url.search();
            search.strip_prefix('?').unwrap_or(search.as_str()).to_string()
        };

        let filter_for_fetch = definy_ui::event_filter_from_query_str(&filter_query);
        wasm_bindgen_futures::spawn_local(async move {
            if let Some(ssr_event_binaries) = ssr_event_binaries {
                let event_pairs = ssr_event_binaries
                    .into_iter()
                    .map(|bytes| {
                        let hash: [u8; 32] =
                            <sha2::Sha256 as sha2::Digest>::digest(&bytes).into();
                        (hash, bytes)
                    })
                    .collect::<Vec<_>>();
                let _ = definy_ui::indexed_db::store_events(&event_pairs).await;
            }
            if !has_ssr_events {
                if let Ok(cached_event_binaries) =
                    definy_ui::indexed_db::load_event_binaries().await
                {
                    let mut cached_events = cached_event_binaries
                        .into_iter()
                        .map(|bytes| {
                            let hash: [u8; 32] =
                                <sha2::Sha256 as sha2::Digest>::digest(&bytes).into();
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
                            event_cache.insert(*hash, event.clone());
                            event_hashes.push(*hash);
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
                let events = definy_ui::fetch::get_events(
                    filter_for_fetch,
                    Some(20),
                    Some(0),
                )
                .await
                .unwrap();
                fire(Box::new(move |state| {
                    let mut event_cache = state.event_cache.clone();
                    let mut event_hashes = Vec::new();
                    for (hash, event) in &events {
                        event_cache.insert(*hash, event.clone());
                        event_hashes.push(*hash);
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

        let location = {
            let initial_url = web_sys::window()
                .unwrap()
                .document()
                .unwrap()
                .url()
                .unwrap_or_default();
            let url = web_sys::Url::new(&initial_url).unwrap();
            let pathname = url.pathname();
            use narumincho_vdom::Route;
            definy_ui::Location::from_url(&pathname)
        };

        let (events, is_loading, has_more) =
            if let Some((ssr_events, has_more, _)) = ssr_state {
            // SSRが送ってきた状態をそのまま採用
            (ssr_events, false, has_more)
        } else {
            (Vec::new(), true, true)
        };

        definy_ui::build_initial_state(
            location,
            events,
            is_loading,
            has_more,
            None,
            definy_ui::event_filter_from_query_str(&filter_query),
        )
    }

    fn on_navigate(state: AppState, url: String) -> AppState {
        use narumincho_vdom::Route;
        if let Ok(web_url) = web_sys::Url::new(&url) {
            let pathname = web_url.pathname();
            let location = definy_ui::Location::from_url(&pathname);
            let search = web_url.search();
            let query = search.strip_prefix('?').unwrap_or(search.as_str());
            let filter_event_type = definy_ui::event_filter_from_query_str(query);
            let mut next = AppState {
                location,
                event_detail_eval_result: None,
                ..state
            };
            if matches!(next.location, Some(definy_ui::Location::Home)) {
                if next.event_list_state.filter_event_type != filter_event_type {
                    next.event_list_state = definy_ui::EventListState {
                        event_hashes: Vec::new(),
                        current_offset: 0,
                        page_size: next.event_list_state.page_size,
                        is_loading: false,
                        has_more: true,
                        filter_event_type,
                    };
                }
            }
            return next;
        }
        state
    }

    fn render(state: &AppState) -> narumincho_vdom::Node<AppState> {
        definy_ui::render(state, &*SSR_RESOURCE_HASH, SSR_INITIAL_STATE_TEXT.as_deref())
    }
}
