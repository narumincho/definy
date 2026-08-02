// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// HTML Content Attributes for https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-small-element
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct Small {
    pub attributes: std::collections::BTreeMap<String, String>,
    pub events: Vec<(String, String)>,
    pub styles: crate::Style,
    pub children: Vec<super::Node>,
    pub aria_active_descendant_element: std::option::Option<String>,
    pub aria_atomic: std::option::Option<String>,
    pub aria_auto_complete: std::option::Option<String>,
    pub aria_braille_label: std::option::Option<String>,
    pub aria_braille_role_description: std::option::Option<String>,
    pub aria_busy: std::option::Option<String>,
    pub aria_checked: std::option::Option<String>,
    pub aria_col_count: std::option::Option<String>,
    pub aria_col_index: std::option::Option<String>,
    pub aria_col_index_text: std::option::Option<String>,
    pub aria_col_span: std::option::Option<String>,
    pub aria_current: std::option::Option<String>,
    pub aria_description: std::option::Option<String>,
    pub aria_disabled: std::option::Option<String>,
    pub aria_expanded: std::option::Option<String>,
    pub aria_has_popup: std::option::Option<String>,
    pub aria_hidden: std::option::Option<String>,
    pub aria_invalid: std::option::Option<String>,
    pub aria_key_shortcuts: std::option::Option<String>,
    pub aria_label: std::option::Option<String>,
    pub aria_level: std::option::Option<String>,
    pub aria_live: std::option::Option<String>,
    pub aria_modal: std::option::Option<String>,
    pub aria_multi_line: std::option::Option<String>,
    pub aria_multi_selectable: std::option::Option<String>,
    pub aria_orientation: std::option::Option<String>,
    pub aria_placeholder: std::option::Option<String>,
    pub aria_pos_in_set: std::option::Option<String>,
    pub aria_pressed: std::option::Option<String>,
    pub aria_read_only: std::option::Option<String>,
    pub aria_relevant: std::option::Option<String>,
    pub aria_required: std::option::Option<String>,
    pub aria_role_description: std::option::Option<String>,
    pub aria_row_count: std::option::Option<String>,
    pub aria_row_index: std::option::Option<String>,
    pub aria_row_index_text: std::option::Option<String>,
    pub aria_row_span: std::option::Option<String>,
    pub aria_selected: std::option::Option<String>,
    pub aria_set_size: std::option::Option<String>,
    pub aria_sort: std::option::Option<String>,
    pub aria_value_max: std::option::Option<String>,
    pub aria_value_min: std::option::Option<String>,
    pub aria_value_now: std::option::Option<String>,
    pub aria_value_text: std::option::Option<String>,
    pub autocorrect: std::option::Option<bool>,
    pub class: std::option::Option<String>,
    pub role: std::option::Option<String>,
    pub text_content: std::option::Option<String>,
    pub virtual_keyboard_policy: std::option::Option<String>,
    pub writing_suggestions: std::option::Option<String>,
}

pub fn small() -> Small {
    Small::default()
}

impl Small {
    pub fn attribute(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        let key = key.into();
        self.attributes
            .insert(crate::normalize_attribute_name(&key), value.into());
        self
    }

    pub fn id(self, value: impl Into<String>) -> Self {
        self.attribute("id", value)
    }

    pub fn class(self, value: impl Into<String>) -> Self {
        self.attribute("class", value)
    }

    pub fn style(mut self, style: impl Into<crate::Style>) -> Self {
        self.styles = style.into();
        self
    }

    pub fn popover(self) -> Self {
        self.attribute("popover", "auto")
    }

    pub fn children(mut self, children: impl Into<Vec<super::Node>>) -> Self {
        self.children = children.into();
        self
    }

    pub fn into_node(self) -> super::Node {
        super::Node::Element(super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Small(self),
            children: Vec::new(),
        })
    }

    pub fn aria_active_descendant_element(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-active-descendant-element".to_string(), value.clone());
        self.aria_active_descendant_element = Some(value);
        self
    }

    pub fn aria_atomic(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-atomic".to_string(), value.clone());
        self.aria_atomic = Some(value);
        self
    }

    pub fn aria_auto_complete(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-auto-complete".to_string(), value.clone());
        self.aria_auto_complete = Some(value);
        self
    }

    pub fn aria_braille_label(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-braille-label".to_string(), value.clone());
        self.aria_braille_label = Some(value);
        self
    }

    pub fn aria_braille_role_description(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-braille-role-description".to_string(), value.clone());
        self.aria_braille_role_description = Some(value);
        self
    }

    pub fn aria_busy(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-busy".to_string(), value.clone());
        self.aria_busy = Some(value);
        self
    }

    pub fn aria_checked(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-checked".to_string(), value.clone());
        self.aria_checked = Some(value);
        self
    }

    pub fn aria_col_count(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-col-count".to_string(), value.clone());
        self.aria_col_count = Some(value);
        self
    }

    pub fn aria_col_index(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-col-index".to_string(), value.clone());
        self.aria_col_index = Some(value);
        self
    }

    pub fn aria_col_index_text(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-col-index-text".to_string(), value.clone());
        self.aria_col_index_text = Some(value);
        self
    }

    pub fn aria_col_span(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-col-span".to_string(), value.clone());
        self.aria_col_span = Some(value);
        self
    }

    pub fn aria_current(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-current".to_string(), value.clone());
        self.aria_current = Some(value);
        self
    }

    pub fn aria_description(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-description".to_string(), value.clone());
        self.aria_description = Some(value);
        self
    }

    pub fn aria_disabled(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-disabled".to_string(), value.clone());
        self.aria_disabled = Some(value);
        self
    }

    pub fn aria_expanded(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-expanded".to_string(), value.clone());
        self.aria_expanded = Some(value);
        self
    }

    pub fn aria_has_popup(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-has-popup".to_string(), value.clone());
        self.aria_has_popup = Some(value);
        self
    }

    pub fn aria_hidden(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-hidden".to_string(), value.clone());
        self.aria_hidden = Some(value);
        self
    }

    pub fn aria_invalid(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-invalid".to_string(), value.clone());
        self.aria_invalid = Some(value);
        self
    }

    pub fn aria_key_shortcuts(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-key-shortcuts".to_string(), value.clone());
        self.aria_key_shortcuts = Some(value);
        self
    }

    pub fn aria_label(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-label".to_string(), value.clone());
        self.aria_label = Some(value);
        self
    }

    pub fn aria_level(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-level".to_string(), value.clone());
        self.aria_level = Some(value);
        self
    }

    pub fn aria_live(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-live".to_string(), value.clone());
        self.aria_live = Some(value);
        self
    }

    pub fn aria_modal(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-modal".to_string(), value.clone());
        self.aria_modal = Some(value);
        self
    }

    pub fn aria_multi_line(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-multi-line".to_string(), value.clone());
        self.aria_multi_line = Some(value);
        self
    }

    pub fn aria_multi_selectable(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-multi-selectable".to_string(), value.clone());
        self.aria_multi_selectable = Some(value);
        self
    }

    pub fn aria_orientation(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-orientation".to_string(), value.clone());
        self.aria_orientation = Some(value);
        self
    }

    pub fn aria_placeholder(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-placeholder".to_string(), value.clone());
        self.aria_placeholder = Some(value);
        self
    }

    pub fn aria_pos_in_set(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-pos-in-set".to_string(), value.clone());
        self.aria_pos_in_set = Some(value);
        self
    }

    pub fn aria_pressed(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-pressed".to_string(), value.clone());
        self.aria_pressed = Some(value);
        self
    }

    pub fn aria_read_only(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-read-only".to_string(), value.clone());
        self.aria_read_only = Some(value);
        self
    }

    pub fn aria_relevant(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-relevant".to_string(), value.clone());
        self.aria_relevant = Some(value);
        self
    }

    pub fn aria_required(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-required".to_string(), value.clone());
        self.aria_required = Some(value);
        self
    }

    pub fn aria_role_description(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-role-description".to_string(), value.clone());
        self.aria_role_description = Some(value);
        self
    }

    pub fn aria_row_count(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-row-count".to_string(), value.clone());
        self.aria_row_count = Some(value);
        self
    }

    pub fn aria_row_index(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-row-index".to_string(), value.clone());
        self.aria_row_index = Some(value);
        self
    }

    pub fn aria_row_index_text(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-row-index-text".to_string(), value.clone());
        self.aria_row_index_text = Some(value);
        self
    }

    pub fn aria_row_span(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-row-span".to_string(), value.clone());
        self.aria_row_span = Some(value);
        self
    }

    pub fn aria_selected(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-selected".to_string(), value.clone());
        self.aria_selected = Some(value);
        self
    }

    pub fn aria_set_size(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-set-size".to_string(), value.clone());
        self.aria_set_size = Some(value);
        self
    }

    pub fn aria_sort(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-sort".to_string(), value.clone());
        self.aria_sort = Some(value);
        self
    }

    pub fn aria_value_max(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-value-max".to_string(), value.clone());
        self.aria_value_max = Some(value);
        self
    }

    pub fn aria_value_min(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-value-min".to_string(), value.clone());
        self.aria_value_min = Some(value);
        self
    }

    pub fn aria_value_now(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-value-now".to_string(), value.clone());
        self.aria_value_now = Some(value);
        self
    }

    pub fn aria_value_text(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("aria-value-text".to_string(), value.clone());
        self.aria_value_text = Some(value);
        self
    }

    pub fn autocorrect(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("autocorrect".to_string(), String::new());
        } else {
            self.attributes.remove("autocorrect");
        }
        self.autocorrect = Some(value);
        self
    }

    pub fn role(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("role".to_string(), value.clone());
        self.role = Some(value);
        self
    }

    pub fn text_content(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("textContent".to_string(), value.clone());
        self.text_content = Some(value);
        self
    }

    pub fn virtual_keyboard_policy(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("virtualKeyboardPolicy".to_string(), value.clone());
        self.virtual_keyboard_policy = Some(value);
        self
    }

    pub fn writing_suggestions(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("writingSuggestions".to_string(), value.clone());
        self.writing_suggestions = Some(value);
        self
    }

    pub fn on_abort(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("abort".to_string(), handler.into()));
        self
    }

    pub fn on_animationcancel(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("animationcancel".to_string(), handler.into()));
        self
    }

    pub fn on_animationend(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("animationend".to_string(), handler.into()));
        self
    }

    pub fn on_animationiteration(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("animationiteration".to_string(), handler.into()));
        self
    }

    pub fn on_animationstart(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("animationstart".to_string(), handler.into()));
        self
    }

    pub fn on_auxclick(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("auxclick".to_string(), handler.into()));
        self
    }

    pub fn on_beforeinput(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("beforeinput".to_string(), handler.into()));
        self
    }

    pub fn on_beforematch(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("beforematch".to_string(), handler.into()));
        self
    }

    pub fn on_beforetoggle(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("beforetoggle".to_string(), handler.into()));
        self
    }

    pub fn on_beforexrselect(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("beforexrselect".to_string(), handler.into()));
        self
    }

    pub fn on_blur(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("blur".to_string(), handler.into()));
        self
    }

    pub fn on_cancel(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("cancel".to_string(), handler.into()));
        self
    }

    pub fn on_canplay(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("canplay".to_string(), handler.into()));
        self
    }

    pub fn on_canplaythrough(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("canplaythrough".to_string(), handler.into()));
        self
    }

    pub fn on_change(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("change".to_string(), handler.into()));
        self
    }

    pub fn on_click(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("click".to_string(), handler.into()));
        self
    }

    pub fn on_close(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("close".to_string(), handler.into()));
        self
    }

    pub fn on_command(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("command".to_string(), handler.into()));
        self
    }

    pub fn on_contextlost(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("contextlost".to_string(), handler.into()));
        self
    }

    pub fn on_contextmenu(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("contextmenu".to_string(), handler.into()));
        self
    }

    pub fn on_contextrestored(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("contextrestored".to_string(), handler.into()));
        self
    }

    pub fn on_copy(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("copy".to_string(), handler.into()));
        self
    }

    pub fn on_cuechange(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("cuechange".to_string(), handler.into()));
        self
    }

    pub fn on_cut(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("cut".to_string(), handler.into()));
        self
    }

    pub fn on_dblclick(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("dblclick".to_string(), handler.into()));
        self
    }

    pub fn on_drag(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("drag".to_string(), handler.into()));
        self
    }

    pub fn on_dragend(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("dragend".to_string(), handler.into()));
        self
    }

    pub fn on_dragenter(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("dragenter".to_string(), handler.into()));
        self
    }

    pub fn on_dragleave(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("dragleave".to_string(), handler.into()));
        self
    }

    pub fn on_dragover(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("dragover".to_string(), handler.into()));
        self
    }

    pub fn on_dragstart(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("dragstart".to_string(), handler.into()));
        self
    }

    pub fn on_drop(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("drop".to_string(), handler.into()));
        self
    }

    pub fn on_durationchange(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("durationchange".to_string(), handler.into()));
        self
    }

    pub fn on_emptied(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("emptied".to_string(), handler.into()));
        self
    }

    pub fn on_ended(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("ended".to_string(), handler.into()));
        self
    }

    pub fn on_error(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("error".to_string(), handler.into()));
        self
    }

    pub fn on_fencedtreeclick(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("fencedtreeclick".to_string(), handler.into()));
        self
    }

    pub fn on_focus(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("focus".to_string(), handler.into()));
        self
    }

    pub fn on_formdata(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("formdata".to_string(), handler.into()));
        self
    }

    pub fn on_fullscreenchange(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("fullscreenchange".to_string(), handler.into()));
        self
    }

    pub fn on_fullscreenerror(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("fullscreenerror".to_string(), handler.into()));
        self
    }

    pub fn on_gotpointercapture(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("gotpointercapture".to_string(), handler.into()));
        self
    }

    pub fn on_input(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("input".to_string(), handler.into()));
        self
    }

    pub fn on_invalid(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("invalid".to_string(), handler.into()));
        self
    }

    pub fn on_keydown(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("keydown".to_string(), handler.into()));
        self
    }

    pub fn on_keypress(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("keypress".to_string(), handler.into()));
        self
    }

    pub fn on_keyup(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("keyup".to_string(), handler.into()));
        self
    }

    pub fn on_load(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("load".to_string(), handler.into()));
        self
    }

    pub fn on_loadeddata(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("loadeddata".to_string(), handler.into()));
        self
    }

    pub fn on_loadedmetadata(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("loadedmetadata".to_string(), handler.into()));
        self
    }

    pub fn on_loadstart(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("loadstart".to_string(), handler.into()));
        self
    }

    pub fn on_lostpointercapture(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("lostpointercapture".to_string(), handler.into()));
        self
    }

    pub fn on_mousedown(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("mousedown".to_string(), handler.into()));
        self
    }

    pub fn on_mouseenter(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("mouseenter".to_string(), handler.into()));
        self
    }

    pub fn on_mouseleave(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("mouseleave".to_string(), handler.into()));
        self
    }

    pub fn on_mousemove(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("mousemove".to_string(), handler.into()));
        self
    }

    pub fn on_mouseout(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("mouseout".to_string(), handler.into()));
        self
    }

    pub fn on_mouseover(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("mouseover".to_string(), handler.into()));
        self
    }

    pub fn on_mouseup(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("mouseup".to_string(), handler.into()));
        self
    }

    pub fn on_paste(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("paste".to_string(), handler.into()));
        self
    }

    pub fn on_pause(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("pause".to_string(), handler.into()));
        self
    }

    pub fn on_play(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("play".to_string(), handler.into()));
        self
    }

    pub fn on_playing(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("playing".to_string(), handler.into()));
        self
    }

    pub fn on_pointercancel(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("pointercancel".to_string(), handler.into()));
        self
    }

    pub fn on_pointerdown(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("pointerdown".to_string(), handler.into()));
        self
    }

    pub fn on_pointerenter(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("pointerenter".to_string(), handler.into()));
        self
    }

    pub fn on_pointerleave(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("pointerleave".to_string(), handler.into()));
        self
    }

    pub fn on_pointermove(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("pointermove".to_string(), handler.into()));
        self
    }

    pub fn on_pointerout(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("pointerout".to_string(), handler.into()));
        self
    }

    pub fn on_pointerover(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("pointerover".to_string(), handler.into()));
        self
    }

    pub fn on_pointerrawupdate(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("pointerrawupdate".to_string(), handler.into()));
        self
    }

    pub fn on_pointerup(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("pointerup".to_string(), handler.into()));
        self
    }

    pub fn on_progress(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("progress".to_string(), handler.into()));
        self
    }

    pub fn on_ratechange(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("ratechange".to_string(), handler.into()));
        self
    }

    pub fn on_reset(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("reset".to_string(), handler.into()));
        self
    }

    pub fn on_resize(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("resize".to_string(), handler.into()));
        self
    }

    pub fn on_scroll(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("scroll".to_string(), handler.into()));
        self
    }

    pub fn on_scrollend(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("scrollend".to_string(), handler.into()));
        self
    }

    pub fn on_securitypolicyviolation(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("securitypolicyviolation".to_string(), handler.into()));
        self
    }

    pub fn on_seeked(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("seeked".to_string(), handler.into()));
        self
    }

    pub fn on_seeking(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("seeking".to_string(), handler.into()));
        self
    }

    pub fn on_select(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("select".to_string(), handler.into()));
        self
    }

    pub fn on_selectionchange(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("selectionchange".to_string(), handler.into()));
        self
    }

    pub fn on_selectstart(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("selectstart".to_string(), handler.into()));
        self
    }

    pub fn on_slotchange(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("slotchange".to_string(), handler.into()));
        self
    }

    pub fn on_snapchanged(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("snapchanged".to_string(), handler.into()));
        self
    }

    pub fn on_snapchanging(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("snapchanging".to_string(), handler.into()));
        self
    }

    pub fn on_stalled(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("stalled".to_string(), handler.into()));
        self
    }

    pub fn on_submit(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("submit".to_string(), handler.into()));
        self
    }

    pub fn on_suspend(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("suspend".to_string(), handler.into()));
        self
    }

    pub fn on_timeupdate(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("timeupdate".to_string(), handler.into()));
        self
    }

    pub fn on_toggle(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("toggle".to_string(), handler.into()));
        self
    }

    pub fn on_touchcancel(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("touchcancel".to_string(), handler.into()));
        self
    }

    pub fn on_touchend(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("touchend".to_string(), handler.into()));
        self
    }

    pub fn on_touchmove(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("touchmove".to_string(), handler.into()));
        self
    }

    pub fn on_touchstart(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("touchstart".to_string(), handler.into()));
        self
    }

    pub fn on_transitioncancel(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("transitioncancel".to_string(), handler.into()));
        self
    }

    pub fn on_transitionend(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("transitionend".to_string(), handler.into()));
        self
    }

    pub fn on_transitionrun(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("transitionrun".to_string(), handler.into()));
        self
    }

    pub fn on_transitionstart(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("transitionstart".to_string(), handler.into()));
        self
    }

    pub fn on_volumechange(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("volumechange".to_string(), handler.into()));
        self
    }

    pub fn on_waiting(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("waiting".to_string(), handler.into()));
        self
    }

    pub fn on_webkitanimationend(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("webkitanimationend".to_string(), handler.into()));
        self
    }

    pub fn on_webkitanimationiteration(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("webkitanimationiteration".to_string(), handler.into()));
        self
    }

    pub fn on_webkitanimationstart(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("webkitanimationstart".to_string(), handler.into()));
        self
    }

    pub fn on_webkittransitionend(mut self, handler: impl Into<String>) -> Self {
        self.events
            .push(("webkittransitionend".to_string(), handler.into()));
        self
    }

    pub fn on_wheel(mut self, handler: impl Into<String>) -> Self {
        self.events.push(("wheel".to_string(), handler.into()));
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Small(self),
            children,
        }
    }
}
