use definy_event::event::{Event, EventContent};
use narumincho_vdom::*;

use crate::app_state::AppState;

pub fn event_list_view(state: &AppState) -> Node<AppState> {
    Div::new()
        .children([
            Div::new().children([text("イベントリスト")]).into_node(),
            Div::new()
                .children([
                    Input::new().id("message-input").name("message").into_node(),
                    Button::new()
                        .on_click(EventHandler::new(async |set_state| {
                            let message =
                                wasm_bindgen::JsCast::dyn_into::<web_sys::HtmlInputElement>(
                                    web_sys::window()
                                        .unwrap()
                                        .document()
                                        .unwrap()
                                        .get_element_by_id("message-input")
                                        .unwrap(),
                                )
                                .unwrap()
                                .value();

                            web_sys::console::log_1(&message.into());
                        }))
                        .children([text("送信")])
                        .into_node(),
                ])
                .into_node(),
            Div::new()
                .style("display: grid; gap: 0.5rem;")
                .children(
                    state
                        .created_account_events
                        .iter()
                        .map(|(_, event)| event_view(event))
                        .collect::<Vec<Node<AppState>>>(),
                )
                .into_node(),
        ])
        .into_node()
}

fn event_view(event: &Event) -> Node<AppState> {
    Div::new()
    .style("border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem; color: var(--text); font-size: 1rem;")
    .children([
    match &event.content {
      EventContent::CreateAccount(create_account_event) => {
        Div::new()
        .children([
            text("アカウント「"),
            text(create_account_event.account_name.as_ref()),
            text("」が作成されました"),
        ])
        .into_node()
      },
      EventContent::Message(message_event) => {
        Div::new()
        .children([
            text("メッセージ「"),
            text(message_event.message.as_ref()),
            text("」が作成されました"),
        ])
        .into_node()
      },
    },
    Div::new()
        .children([text(&event.time.to_string())])
        .into_node(),
  ])
  .into_node()
}
