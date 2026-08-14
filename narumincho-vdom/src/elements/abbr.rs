// このファイルは narumincho-vdom-build によって自動生成されました。

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbbrAutocapitalize {
    Off,
    None,
    Characters,
    Words,
    Sentences,
}

impl AbbrAutocapitalize {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Off => "off",
            Self::None => "none",
            Self::Characters => "characters",
            Self::Words => "words",
            Self::Sentences => "sentences",
        }
    }
}

impl From<AbbrAutocapitalize> for String {
    fn from(value: AbbrAutocapitalize) -> Self {
        value.as_str().to_string()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbbrDir {
    Ltr,
    Rtl,
    Auto,
}

impl AbbrDir {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Ltr => "ltr",
            Self::Rtl => "rtl",
            Self::Auto => "auto",
        }
    }
}

impl From<AbbrDir> for String {
    fn from(value: AbbrDir) -> Self {
        value.as_str().to_string()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbbrPopover {
    Auto,
    Manual,
}

impl AbbrPopover {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Auto => "auto",
            Self::Manual => "manual",
        }
    }
}

impl From<AbbrPopover> for String {
    fn from(value: AbbrPopover) -> Self {
        value.as_str().to_string()
    }
}

/// HTML Content Attributes for https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-abbr-element
#[derive(Debug, Clone, PartialEq)]
pub struct Abbr {
    pub attributes: Vec<(String, String)>,
    pub events: Vec<(String, crate::EventHandler)>,
    pub styles: crate::Style,
    pub children: Vec<crate::Node>,
}

pub fn abbr() -> Abbr {
    Abbr::new()
}

impl Default for Abbr {
    fn default() -> Self {
        Self::new()
    }
}

impl Abbr {
    pub fn new() -> Self {
        Self {
            attributes: Vec::new(),
            events: Vec::new(),
            styles: crate::Style::new(),
            children: Vec::new(),
        }
    }

    pub fn attribute(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        let key = key.into();
        self.attributes
            .push((crate::normalize_attribute_name(&key), value.into()));
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

    pub fn children(mut self, children: impl Into<Vec<crate::Node>>) -> Self {
        self.children = children.into();
        self
    }

    pub fn into_node(self) -> crate::Node {
        crate::Node::Element(crate::Element {
            element_name: "abbr".to_string(),
            attributes: self.attributes,
            styles: self.styles,
            events: self.events,
            children: self.children,
        })
    }
    pub fn access_key(self, value: impl Into<String>) -> Self {
        self.attribute("accessKey", value)
    }

    pub fn aria_active_descendant_element(self, value: impl Into<String>) -> Self {
        self.attribute("aria-active-descendant-element", value)
    }

    pub fn aria_atomic(self, value: impl Into<String>) -> Self {
        self.attribute("aria-atomic", value)
    }

    pub fn aria_auto_complete(self, value: impl Into<String>) -> Self {
        self.attribute("aria-auto-complete", value)
    }

    pub fn aria_braille_label(self, value: impl Into<String>) -> Self {
        self.attribute("aria-braille-label", value)
    }

    pub fn aria_braille_role_description(self, value: impl Into<String>) -> Self {
        self.attribute("aria-braille-role-description", value)
    }

    pub fn aria_busy(self, value: impl Into<String>) -> Self {
        self.attribute("aria-busy", value)
    }

    pub fn aria_checked(self, value: impl Into<String>) -> Self {
        self.attribute("aria-checked", value)
    }

    pub fn aria_col_count(self, value: impl Into<String>) -> Self {
        self.attribute("aria-col-count", value)
    }

    pub fn aria_col_index(self, value: impl Into<String>) -> Self {
        self.attribute("aria-col-index", value)
    }

    pub fn aria_col_index_text(self, value: impl Into<String>) -> Self {
        self.attribute("aria-col-index-text", value)
    }

    pub fn aria_col_span(self, value: impl Into<String>) -> Self {
        self.attribute("aria-col-span", value)
    }

    pub fn aria_current(self, value: impl Into<String>) -> Self {
        self.attribute("aria-current", value)
    }

    pub fn aria_description(self, value: impl Into<String>) -> Self {
        self.attribute("aria-description", value)
    }

    pub fn aria_disabled(self, value: impl Into<String>) -> Self {
        self.attribute("aria-disabled", value)
    }

    pub fn aria_expanded(self, value: impl Into<String>) -> Self {
        self.attribute("aria-expanded", value)
    }

    pub fn aria_has_popup(self, value: impl Into<String>) -> Self {
        self.attribute("aria-has-popup", value)
    }

    pub fn aria_hidden(self, value: impl Into<String>) -> Self {
        self.attribute("aria-hidden", value)
    }

    pub fn aria_invalid(self, value: impl Into<String>) -> Self {
        self.attribute("aria-invalid", value)
    }

    pub fn aria_key_shortcuts(self, value: impl Into<String>) -> Self {
        self.attribute("aria-key-shortcuts", value)
    }

    pub fn aria_label(self, value: impl Into<String>) -> Self {
        self.attribute("aria-label", value)
    }

    pub fn aria_level(self, value: impl Into<String>) -> Self {
        self.attribute("aria-level", value)
    }

    pub fn aria_live(self, value: impl Into<String>) -> Self {
        self.attribute("aria-live", value)
    }

    pub fn aria_modal(self, value: impl Into<String>) -> Self {
        self.attribute("aria-modal", value)
    }

    pub fn aria_multi_line(self, value: impl Into<String>) -> Self {
        self.attribute("aria-multi-line", value)
    }

    pub fn aria_multi_selectable(self, value: impl Into<String>) -> Self {
        self.attribute("aria-multi-selectable", value)
    }

    pub fn aria_orientation(self, value: impl Into<String>) -> Self {
        self.attribute("aria-orientation", value)
    }

    pub fn aria_placeholder(self, value: impl Into<String>) -> Self {
        self.attribute("aria-placeholder", value)
    }

    pub fn aria_pos_in_set(self, value: impl Into<String>) -> Self {
        self.attribute("aria-pos-in-set", value)
    }

    pub fn aria_pressed(self, value: impl Into<String>) -> Self {
        self.attribute("aria-pressed", value)
    }

    pub fn aria_read_only(self, value: impl Into<String>) -> Self {
        self.attribute("aria-read-only", value)
    }

    pub fn aria_relevant(self, value: impl Into<String>) -> Self {
        self.attribute("aria-relevant", value)
    }

    pub fn aria_required(self, value: impl Into<String>) -> Self {
        self.attribute("aria-required", value)
    }

    pub fn aria_role_description(self, value: impl Into<String>) -> Self {
        self.attribute("aria-role-description", value)
    }

    pub fn aria_row_count(self, value: impl Into<String>) -> Self {
        self.attribute("aria-row-count", value)
    }

    pub fn aria_row_index(self, value: impl Into<String>) -> Self {
        self.attribute("aria-row-index", value)
    }

    pub fn aria_row_index_text(self, value: impl Into<String>) -> Self {
        self.attribute("aria-row-index-text", value)
    }

    pub fn aria_row_span(self, value: impl Into<String>) -> Self {
        self.attribute("aria-row-span", value)
    }

    pub fn aria_selected(self, value: impl Into<String>) -> Self {
        self.attribute("aria-selected", value)
    }

    pub fn aria_set_size(self, value: impl Into<String>) -> Self {
        self.attribute("aria-set-size", value)
    }

    pub fn aria_sort(self, value: impl Into<String>) -> Self {
        self.attribute("aria-sort", value)
    }

    pub fn aria_value_max(self, value: impl Into<String>) -> Self {
        self.attribute("aria-value-max", value)
    }

    pub fn aria_value_min(self, value: impl Into<String>) -> Self {
        self.attribute("aria-value-min", value)
    }

    pub fn aria_value_now(self, value: impl Into<String>) -> Self {
        self.attribute("aria-value-now", value)
    }

    pub fn aria_value_text(self, value: impl Into<String>) -> Self {
        self.attribute("aria-value-text", value)
    }

    pub fn autocapitalize(self, value: impl Into<String>) -> Self {
        self.attribute("autocapitalize", value)
    }

    pub fn autocorrect(mut self, value: bool) -> Self {
        self.attributes.retain(|(key, _)| key != "autocorrect");
        if value {
            self.attributes
                .push(("autocorrect".to_string(), String::new()));
        }
        self
    }

    pub fn autofocus(mut self, value: bool) -> Self {
        self.attributes.retain(|(key, _)| key != "autofocus");
        if value {
            self.attributes
                .push(("autofocus".to_string(), String::new()));
        }
        self
    }

    pub fn content_editable(self, value: impl Into<String>) -> Self {
        self.attribute("contentEditable", value)
    }

    pub fn dir(self, value: impl Into<String>) -> Self {
        self.attribute("dir", value)
    }

    pub fn draggable(mut self, value: bool) -> Self {
        self.attributes.retain(|(key, _)| key != "draggable");
        if value {
            self.attributes
                .push(("draggable".to_string(), String::new()));
        }
        self
    }

    pub fn enter_key_hint(self, value: impl Into<String>) -> Self {
        self.attribute("enterKeyHint", value)
    }

    pub fn hidden(self, value: impl Into<String>) -> Self {
        self.attribute("hidden", value)
    }

    pub fn inert(mut self, value: bool) -> Self {
        self.attributes.retain(|(key, _)| key != "inert");
        if value {
            self.attributes.push(("inert".to_string(), String::new()));
        }
        self
    }

    pub fn input_mode(self, value: impl Into<String>) -> Self {
        self.attribute("inputMode", value)
    }

    pub fn lang(self, value: impl Into<String>) -> Self {
        self.attribute("lang", value)
    }

    pub fn nonce(self, value: impl Into<String>) -> Self {
        self.attribute("nonce", value)
    }

    pub fn role(self, value: impl Into<String>) -> Self {
        self.attribute("role", value)
    }

    pub fn slot(self, value: impl Into<String>) -> Self {
        self.attribute("slot", value)
    }

    pub fn spellcheck(mut self, value: bool) -> Self {
        self.attributes.retain(|(key, _)| key != "spellcheck");
        if value {
            self.attributes
                .push(("spellcheck".to_string(), String::new()));
        }
        self
    }

    pub fn tab_index(self, value: impl Into<String>) -> Self {
        self.attribute("tabIndex", value)
    }

    pub fn text_content(self, value: impl Into<String>) -> Self {
        self.attribute("textContent", value)
    }

    pub fn title(self, value: impl Into<String>) -> Self {
        self.attribute("title", value)
    }

    pub fn translate(mut self, value: bool) -> Self {
        self.attributes.retain(|(key, _)| key != "translate");
        if value {
            self.attributes
                .push(("translate".to_string(), String::new()));
        }
        self
    }

    pub fn virtual_keyboard_policy(self, value: impl Into<String>) -> Self {
        self.attribute("virtualKeyboardPolicy", value)
    }

    pub fn writing_suggestions(self, value: impl Into<String>) -> Self {
        self.attribute("writingSuggestions", value)
    }

    pub fn on_abort(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("abort".to_string(), handler));
        self
    }

    pub fn on_animationcancel(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("animationcancel".to_string(), handler));
        self
    }

    pub fn on_animationend(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("animationend".to_string(), handler));
        self
    }

    pub fn on_animationiteration(mut self, handler: crate::EventHandler) -> Self {
        self.events
            .push(("animationiteration".to_string(), handler));
        self
    }

    pub fn on_animationstart(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("animationstart".to_string(), handler));
        self
    }

    pub fn on_auxclick(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("auxclick".to_string(), handler));
        self
    }

    pub fn on_beforeinput(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("beforeinput".to_string(), handler));
        self
    }

    pub fn on_beforematch(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("beforematch".to_string(), handler));
        self
    }

    pub fn on_beforetoggle(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("beforetoggle".to_string(), handler));
        self
    }

    pub fn on_beforexrselect(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("beforexrselect".to_string(), handler));
        self
    }

    pub fn on_blur(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("blur".to_string(), handler));
        self
    }

    pub fn on_cancel(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("cancel".to_string(), handler));
        self
    }

    pub fn on_canplay(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("canplay".to_string(), handler));
        self
    }

    pub fn on_canplaythrough(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("canplaythrough".to_string(), handler));
        self
    }

    pub fn on_change(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("change".to_string(), handler));
        self
    }

    pub fn on_click(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("click".to_string(), handler));
        self
    }

    pub fn on_close(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("close".to_string(), handler));
        self
    }

    pub fn on_command(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("command".to_string(), handler));
        self
    }

    pub fn on_contextlost(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("contextlost".to_string(), handler));
        self
    }

    pub fn on_contextmenu(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("contextmenu".to_string(), handler));
        self
    }

    pub fn on_contextrestored(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("contextrestored".to_string(), handler));
        self
    }

    pub fn on_copy(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("copy".to_string(), handler));
        self
    }

    pub fn on_cuechange(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("cuechange".to_string(), handler));
        self
    }

    pub fn on_cut(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("cut".to_string(), handler));
        self
    }

    pub fn on_dblclick(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("dblclick".to_string(), handler));
        self
    }

    pub fn on_drag(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("drag".to_string(), handler));
        self
    }

    pub fn on_dragend(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("dragend".to_string(), handler));
        self
    }

    pub fn on_dragenter(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("dragenter".to_string(), handler));
        self
    }

    pub fn on_dragleave(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("dragleave".to_string(), handler));
        self
    }

    pub fn on_dragover(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("dragover".to_string(), handler));
        self
    }

    pub fn on_dragstart(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("dragstart".to_string(), handler));
        self
    }

    pub fn on_drop(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("drop".to_string(), handler));
        self
    }

    pub fn on_durationchange(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("durationchange".to_string(), handler));
        self
    }

    pub fn on_emptied(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("emptied".to_string(), handler));
        self
    }

    pub fn on_ended(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("ended".to_string(), handler));
        self
    }

    pub fn on_error(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("error".to_string(), handler));
        self
    }

    pub fn on_fencedtreeclick(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("fencedtreeclick".to_string(), handler));
        self
    }

    pub fn on_focus(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("focus".to_string(), handler));
        self
    }

    pub fn on_formdata(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("formdata".to_string(), handler));
        self
    }

    pub fn on_fullscreenchange(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("fullscreenchange".to_string(), handler));
        self
    }

    pub fn on_fullscreenerror(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("fullscreenerror".to_string(), handler));
        self
    }

    pub fn on_gotpointercapture(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("gotpointercapture".to_string(), handler));
        self
    }

    pub fn on_input(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("input".to_string(), handler));
        self
    }

    pub fn on_invalid(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("invalid".to_string(), handler));
        self
    }

    pub fn on_keydown(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("keydown".to_string(), handler));
        self
    }

    pub fn on_keypress(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("keypress".to_string(), handler));
        self
    }

    pub fn on_keyup(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("keyup".to_string(), handler));
        self
    }

    pub fn on_load(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("load".to_string(), handler));
        self
    }

    pub fn on_loadeddata(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("loadeddata".to_string(), handler));
        self
    }

    pub fn on_loadedmetadata(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("loadedmetadata".to_string(), handler));
        self
    }

    pub fn on_loadstart(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("loadstart".to_string(), handler));
        self
    }

    pub fn on_lostpointercapture(mut self, handler: crate::EventHandler) -> Self {
        self.events
            .push(("lostpointercapture".to_string(), handler));
        self
    }

    pub fn on_mousedown(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("mousedown".to_string(), handler));
        self
    }

    pub fn on_mouseenter(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("mouseenter".to_string(), handler));
        self
    }

    pub fn on_mouseleave(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("mouseleave".to_string(), handler));
        self
    }

    pub fn on_mousemove(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("mousemove".to_string(), handler));
        self
    }

    pub fn on_mouseout(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("mouseout".to_string(), handler));
        self
    }

    pub fn on_mouseover(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("mouseover".to_string(), handler));
        self
    }

    pub fn on_mouseup(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("mouseup".to_string(), handler));
        self
    }

    pub fn on_paste(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("paste".to_string(), handler));
        self
    }

    pub fn on_pause(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pause".to_string(), handler));
        self
    }

    pub fn on_play(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("play".to_string(), handler));
        self
    }

    pub fn on_playing(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("playing".to_string(), handler));
        self
    }

    pub fn on_pointercancel(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointercancel".to_string(), handler));
        self
    }

    pub fn on_pointerdown(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointerdown".to_string(), handler));
        self
    }

    pub fn on_pointerenter(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointerenter".to_string(), handler));
        self
    }

    pub fn on_pointerleave(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointerleave".to_string(), handler));
        self
    }

    pub fn on_pointermove(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointermove".to_string(), handler));
        self
    }

    pub fn on_pointerout(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointerout".to_string(), handler));
        self
    }

    pub fn on_pointerover(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointerover".to_string(), handler));
        self
    }

    pub fn on_pointerrawupdate(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointerrawupdate".to_string(), handler));
        self
    }

    pub fn on_pointerup(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("pointerup".to_string(), handler));
        self
    }

    pub fn on_progress(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("progress".to_string(), handler));
        self
    }

    pub fn on_ratechange(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("ratechange".to_string(), handler));
        self
    }

    pub fn on_reset(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("reset".to_string(), handler));
        self
    }

    pub fn on_resize(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("resize".to_string(), handler));
        self
    }

    pub fn on_scroll(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("scroll".to_string(), handler));
        self
    }

    pub fn on_scrollend(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("scrollend".to_string(), handler));
        self
    }

    pub fn on_securitypolicyviolation(mut self, handler: crate::EventHandler) -> Self {
        self.events
            .push(("securitypolicyviolation".to_string(), handler));
        self
    }

    pub fn on_seeked(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("seeked".to_string(), handler));
        self
    }

    pub fn on_seeking(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("seeking".to_string(), handler));
        self
    }

    pub fn on_select(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("select".to_string(), handler));
        self
    }

    pub fn on_selectionchange(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("selectionchange".to_string(), handler));
        self
    }

    pub fn on_selectstart(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("selectstart".to_string(), handler));
        self
    }

    pub fn on_slotchange(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("slotchange".to_string(), handler));
        self
    }

    pub fn on_snapchanged(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("snapchanged".to_string(), handler));
        self
    }

    pub fn on_snapchanging(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("snapchanging".to_string(), handler));
        self
    }

    pub fn on_stalled(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("stalled".to_string(), handler));
        self
    }

    pub fn on_submit(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("submit".to_string(), handler));
        self
    }

    pub fn on_suspend(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("suspend".to_string(), handler));
        self
    }

    pub fn on_timeupdate(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("timeupdate".to_string(), handler));
        self
    }

    pub fn on_toggle(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("toggle".to_string(), handler));
        self
    }

    pub fn on_touchcancel(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("touchcancel".to_string(), handler));
        self
    }

    pub fn on_touchend(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("touchend".to_string(), handler));
        self
    }

    pub fn on_touchmove(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("touchmove".to_string(), handler));
        self
    }

    pub fn on_touchstart(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("touchstart".to_string(), handler));
        self
    }

    pub fn on_transitioncancel(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("transitioncancel".to_string(), handler));
        self
    }

    pub fn on_transitionend(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("transitionend".to_string(), handler));
        self
    }

    pub fn on_transitionrun(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("transitionrun".to_string(), handler));
        self
    }

    pub fn on_transitionstart(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("transitionstart".to_string(), handler));
        self
    }

    pub fn on_volumechange(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("volumechange".to_string(), handler));
        self
    }

    pub fn on_waiting(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("waiting".to_string(), handler));
        self
    }

    pub fn on_wheel(mut self, handler: crate::EventHandler) -> Self {
        self.events.push(("wheel".to_string(), handler));
        self
    }
}
impl From<Abbr> for crate::Node {
    fn from(value: Abbr) -> Self {
        value.into_node()
    }
}
