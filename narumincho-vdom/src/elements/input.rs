// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputType {
    Text,
    Password,
    Checkbox,
    Radio,
    Submit,
    Reset,
    Button,
    File,
    Hidden,
    Image,
    DatetimeLocal,
    Date,
    Month,
    Time,
    Week,
    Number,
    Range,
    Email,
    Url,
    Search,
    Tel,
    Color,
}

impl InputType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Text => "text",
            Self::Password => "password",
            Self::Checkbox => "checkbox",
            Self::Radio => "radio",
            Self::Submit => "submit",
            Self::Reset => "reset",
            Self::Button => "button",
            Self::File => "file",
            Self::Hidden => "hidden",
            Self::Image => "image",
            Self::DatetimeLocal => "datetime-local",
            Self::Date => "date",
            Self::Month => "month",
            Self::Time => "time",
            Self::Week => "week",
            Self::Number => "number",
            Self::Range => "range",
            Self::Email => "email",
            Self::Url => "url",
            Self::Search => "search",
            Self::Tel => "tel",
            Self::Color => "color",
        }
    }
}

/// HTML Content Attributes for https://html.spec.whatwg.org/multipage/input.html#the-input-element
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct Input {
    pub attributes: std::collections::BTreeMap<String, String>,
    pub styles: crate::Style,
    pub children: Vec<super::Node>,
    pub accept: std::option::Option<String>,
    pub align: std::option::Option<String>,
    pub alpha: std::option::Option<bool>,
    pub alt: std::option::Option<String>,
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
    pub autocomplete: std::option::Option<String>,
    pub autocorrect: std::option::Option<bool>,
    pub capture: std::option::Option<String>,
    pub checked: std::option::Option<bool>,
    pub class: std::option::Option<String>,
    pub color_space: std::option::Option<String>,
    pub default_checked: std::option::Option<bool>,
    pub default_value: std::option::Option<String>,
    pub dir_name: std::option::Option<String>,
    pub disabled: std::option::Option<bool>,
    pub files: std::option::Option<String>,
    pub form_action: std::option::Option<String>,
    pub form_enctype: std::option::Option<String>,
    pub form_method: std::option::Option<String>,
    pub form_no_validate: std::option::Option<bool>,
    pub form_target: std::option::Option<String>,
    pub indeterminate: std::option::Option<bool>,
    pub max: std::option::Option<String>,
    pub max_length: std::option::Option<String>,
    pub min: std::option::Option<String>,
    pub min_length: std::option::Option<String>,
    pub multiple: std::option::Option<bool>,
    pub name: std::option::Option<String>,
    pub pattern: std::option::Option<String>,
    pub placeholder: std::option::Option<String>,
    pub popover_target_action: std::option::Option<String>,
    pub read_only: std::option::Option<bool>,
    pub required: std::option::Option<bool>,
    pub role: std::option::Option<String>,
    pub selection_direction: std::option::Option<String>,
    pub selection_end: std::option::Option<String>,
    pub selection_start: std::option::Option<String>,
    pub src: std::option::Option<String>,
    pub step: std::option::Option<String>,
    pub text_content: std::option::Option<String>,
    pub r#type: std::option::Option<InputType>,
    pub use_map: std::option::Option<String>,
    pub value: std::option::Option<String>,
    pub value_as_date: std::option::Option<String>,
    pub virtual_keyboard_policy: std::option::Option<String>,
    pub webkitdirectory: std::option::Option<bool>,
    pub writing_suggestions: std::option::Option<String>,
}

/// JavaScript / DOM Properties for https://html.spec.whatwg.org/multipage/input.html#the-input-element
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct InputJsProperties {
    pub access_key_label: std::option::Option<String>,
    pub active_view_transition: std::option::Option<String>,
    pub assigned_slot: std::option::Option<String>,
    pub attribute_style_map: std::option::Option<String>,
    pub attributes: std::option::Option<String>,
    pub base_u_r_i: std::option::Option<String>,
    pub child_nodes: std::option::Option<String>,
    pub children: std::option::Option<String>,
    pub class_list: std::option::Option<String>,
    pub client_height: std::option::Option<String>,
    pub client_left: std::option::Option<String>,
    pub client_top: std::option::Option<String>,
    pub client_width: std::option::Option<String>,
    pub containertiming: std::option::Option<String>,
    pub containertiming_ignore: std::option::Option<String>,
    pub current_c_s_s_zoom: std::option::Option<String>,
    pub custom_element_registry: std::option::Option<String>,
    pub dataset: std::option::Option<String>,
    pub double: std::option::Option<String>,
    pub edit_context: std::option::Option<String>,
    pub element_timing: std::option::Option<String>,
    pub first_child: std::option::Option<String>,
    pub first_element_child: std::option::Option<String>,
    pub form: std::option::Option<String>,
    pub heading_reset: std::option::Option<bool>,
    pub inner_h_t_m_l: std::option::Option<String>,
    pub inner_text: std::option::Option<String>,
    pub is_connected: std::option::Option<bool>,
    pub is_content_editable: std::option::Option<bool>,
    pub labels: std::option::Option<String>,
    pub last_child: std::option::Option<String>,
    pub last_element_child: std::option::Option<String>,
    pub list: std::option::Option<String>,
    pub local_name: std::option::Option<String>,
    pub long: std::option::Option<String>,
    pub namespace_u_r_i: std::option::Option<String>,
    pub next_element_sibling: std::option::Option<String>,
    pub next_sibling: std::option::Option<String>,
    pub node_name: std::option::Option<String>,
    pub node_value: std::option::Option<String>,
    pub offset_height: std::option::Option<String>,
    pub offset_left: std::option::Option<String>,
    pub offset_parent: std::option::Option<String>,
    pub offset_top: std::option::Option<String>,
    pub offset_width: std::option::Option<String>,
    pub outer_h_t_m_l: std::option::Option<String>,
    pub outer_text: std::option::Option<String>,
    pub owner_document: std::option::Option<String>,
    pub parent_element: std::option::Option<String>,
    pub parent_node: std::option::Option<String>,
    pub popover_target_element: std::option::Option<String>,
    pub prefix: std::option::Option<String>,
    pub previous_element_sibling: std::option::Option<String>,
    pub previous_sibling: std::option::Option<String>,
    pub region_overset: std::option::Option<String>,
    pub scroll_height: std::option::Option<String>,
    pub scroll_parent: std::option::Option<String>,
    pub scroll_width: std::option::Option<String>,
    pub shadow_root: std::option::Option<String>,
    pub short: std::option::Option<String>,
    pub tag_name: std::option::Option<String>,
    pub validation_message: std::option::Option<String>,
    pub validity: std::option::Option<String>,
    pub will_validate: std::option::Option<bool>,
}

pub fn input() -> Input {
    Input::default()
}

impl Input {
    pub fn attribute(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.attributes.insert(key.into(), value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.attribute("id", value)
    }

    pub fn class(mut self, value: impl Into<String>) -> Self {
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
            element_content: super::ElementContent::Input(self),
            children: Vec::new(),
        })
    }

    pub fn accept(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("accept".to_string(), value.clone());
        self.accept = Some(value);
        self
    }

    pub fn align(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("align".to_string(), value.clone());
        self.align = Some(value);
        self
    }

    pub fn alpha(mut self, value: bool) -> Self {
        if value {
            self.attributes.insert("alpha".to_string(), String::new());
        } else {
            self.attributes.remove("alpha");
        }
        self.alpha = Some(value);
        self
    }

    pub fn alt(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("alt".to_string(), value.clone());
        self.alt = Some(value);
        self
    }

    pub fn aria_active_descendant_element(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaActiveDescendantElement".to_string(), value.clone());
        self.aria_active_descendant_element = Some(value);
        self
    }

    pub fn aria_atomic(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaAtomic".to_string(), value.clone());
        self.aria_atomic = Some(value);
        self
    }

    pub fn aria_auto_complete(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaAutoComplete".to_string(), value.clone());
        self.aria_auto_complete = Some(value);
        self
    }

    pub fn aria_braille_label(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaBrailleLabel".to_string(), value.clone());
        self.aria_braille_label = Some(value);
        self
    }

    pub fn aria_braille_role_description(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaBrailleRoleDescription".to_string(), value.clone());
        self.aria_braille_role_description = Some(value);
        self
    }

    pub fn aria_busy(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaBusy".to_string(), value.clone());
        self.aria_busy = Some(value);
        self
    }

    pub fn aria_checked(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaChecked".to_string(), value.clone());
        self.aria_checked = Some(value);
        self
    }

    pub fn aria_col_count(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaColCount".to_string(), value.clone());
        self.aria_col_count = Some(value);
        self
    }

    pub fn aria_col_index(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaColIndex".to_string(), value.clone());
        self.aria_col_index = Some(value);
        self
    }

    pub fn aria_col_index_text(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaColIndexText".to_string(), value.clone());
        self.aria_col_index_text = Some(value);
        self
    }

    pub fn aria_col_span(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaColSpan".to_string(), value.clone());
        self.aria_col_span = Some(value);
        self
    }

    pub fn aria_current(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaCurrent".to_string(), value.clone());
        self.aria_current = Some(value);
        self
    }

    pub fn aria_description(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaDescription".to_string(), value.clone());
        self.aria_description = Some(value);
        self
    }

    pub fn aria_disabled(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaDisabled".to_string(), value.clone());
        self.aria_disabled = Some(value);
        self
    }

    pub fn aria_expanded(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaExpanded".to_string(), value.clone());
        self.aria_expanded = Some(value);
        self
    }

    pub fn aria_has_popup(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaHasPopup".to_string(), value.clone());
        self.aria_has_popup = Some(value);
        self
    }

    pub fn aria_hidden(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaHidden".to_string(), value.clone());
        self.aria_hidden = Some(value);
        self
    }

    pub fn aria_invalid(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaInvalid".to_string(), value.clone());
        self.aria_invalid = Some(value);
        self
    }

    pub fn aria_key_shortcuts(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaKeyShortcuts".to_string(), value.clone());
        self.aria_key_shortcuts = Some(value);
        self
    }

    pub fn aria_label(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaLabel".to_string(), value.clone());
        self.aria_label = Some(value);
        self
    }

    pub fn aria_level(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaLevel".to_string(), value.clone());
        self.aria_level = Some(value);
        self
    }

    pub fn aria_live(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaLive".to_string(), value.clone());
        self.aria_live = Some(value);
        self
    }

    pub fn aria_modal(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaModal".to_string(), value.clone());
        self.aria_modal = Some(value);
        self
    }

    pub fn aria_multi_line(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaMultiLine".to_string(), value.clone());
        self.aria_multi_line = Some(value);
        self
    }

    pub fn aria_multi_selectable(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaMultiSelectable".to_string(), value.clone());
        self.aria_multi_selectable = Some(value);
        self
    }

    pub fn aria_orientation(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaOrientation".to_string(), value.clone());
        self.aria_orientation = Some(value);
        self
    }

    pub fn aria_placeholder(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaPlaceholder".to_string(), value.clone());
        self.aria_placeholder = Some(value);
        self
    }

    pub fn aria_pos_in_set(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaPosInSet".to_string(), value.clone());
        self.aria_pos_in_set = Some(value);
        self
    }

    pub fn aria_pressed(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaPressed".to_string(), value.clone());
        self.aria_pressed = Some(value);
        self
    }

    pub fn aria_read_only(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaReadOnly".to_string(), value.clone());
        self.aria_read_only = Some(value);
        self
    }

    pub fn aria_relevant(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaRelevant".to_string(), value.clone());
        self.aria_relevant = Some(value);
        self
    }

    pub fn aria_required(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaRequired".to_string(), value.clone());
        self.aria_required = Some(value);
        self
    }

    pub fn aria_role_description(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaRoleDescription".to_string(), value.clone());
        self.aria_role_description = Some(value);
        self
    }

    pub fn aria_row_count(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaRowCount".to_string(), value.clone());
        self.aria_row_count = Some(value);
        self
    }

    pub fn aria_row_index(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaRowIndex".to_string(), value.clone());
        self.aria_row_index = Some(value);
        self
    }

    pub fn aria_row_index_text(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaRowIndexText".to_string(), value.clone());
        self.aria_row_index_text = Some(value);
        self
    }

    pub fn aria_row_span(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaRowSpan".to_string(), value.clone());
        self.aria_row_span = Some(value);
        self
    }

    pub fn aria_selected(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaSelected".to_string(), value.clone());
        self.aria_selected = Some(value);
        self
    }

    pub fn aria_set_size(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaSetSize".to_string(), value.clone());
        self.aria_set_size = Some(value);
        self
    }

    pub fn aria_sort(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaSort".to_string(), value.clone());
        self.aria_sort = Some(value);
        self
    }

    pub fn aria_value_max(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaValueMax".to_string(), value.clone());
        self.aria_value_max = Some(value);
        self
    }

    pub fn aria_value_min(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaValueMin".to_string(), value.clone());
        self.aria_value_min = Some(value);
        self
    }

    pub fn aria_value_now(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaValueNow".to_string(), value.clone());
        self.aria_value_now = Some(value);
        self
    }

    pub fn aria_value_text(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("ariaValueText".to_string(), value.clone());
        self.aria_value_text = Some(value);
        self
    }

    pub fn autocomplete(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("autocomplete".to_string(), value.clone());
        self.autocomplete = Some(value);
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

    pub fn capture(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("capture".to_string(), value.clone());
        self.capture = Some(value);
        self
    }

    pub fn checked(mut self, value: bool) -> Self {
        if value {
            self.attributes.insert("checked".to_string(), String::new());
        } else {
            self.attributes.remove("checked");
        }
        self.checked = Some(value);
        self
    }

    pub fn color_space(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("colorSpace".to_string(), value.clone());
        self.color_space = Some(value);
        self
    }

    pub fn default_checked(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("defaultChecked".to_string(), String::new());
        } else {
            self.attributes.remove("defaultChecked");
        }
        self.default_checked = Some(value);
        self
    }

    pub fn default_value(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("defaultValue".to_string(), value.clone());
        self.default_value = Some(value);
        self
    }

    pub fn dir_name(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("dirName".to_string(), value.clone());
        self.dir_name = Some(value);
        self
    }

    pub fn disabled(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("disabled".to_string(), String::new());
        } else {
            self.attributes.remove("disabled");
        }
        self.disabled = Some(value);
        self
    }

    pub fn files(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("files".to_string(), value.clone());
        self.files = Some(value);
        self
    }

    pub fn form_action(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("formAction".to_string(), value.clone());
        self.form_action = Some(value);
        self
    }

    pub fn form_enctype(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("formEnctype".to_string(), value.clone());
        self.form_enctype = Some(value);
        self
    }

    pub fn form_method(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("formMethod".to_string(), value.clone());
        self.form_method = Some(value);
        self
    }

    pub fn form_no_validate(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("formNoValidate".to_string(), String::new());
        } else {
            self.attributes.remove("formNoValidate");
        }
        self.form_no_validate = Some(value);
        self
    }

    pub fn form_target(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("formTarget".to_string(), value.clone());
        self.form_target = Some(value);
        self
    }

    pub fn indeterminate(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("indeterminate".to_string(), String::new());
        } else {
            self.attributes.remove("indeterminate");
        }
        self.indeterminate = Some(value);
        self
    }

    pub fn max(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("max".to_string(), value.clone());
        self.max = Some(value);
        self
    }

    pub fn max_length(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("maxLength".to_string(), value.clone());
        self.max_length = Some(value);
        self
    }

    pub fn min(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("min".to_string(), value.clone());
        self.min = Some(value);
        self
    }

    pub fn min_length(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("minLength".to_string(), value.clone());
        self.min_length = Some(value);
        self
    }

    pub fn multiple(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("multiple".to_string(), String::new());
        } else {
            self.attributes.remove("multiple");
        }
        self.multiple = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("name".to_string(), value.clone());
        self.name = Some(value);
        self
    }

    pub fn pattern(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("pattern".to_string(), value.clone());
        self.pattern = Some(value);
        self
    }

    pub fn placeholder(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("placeholder".to_string(), value.clone());
        self.placeholder = Some(value);
        self
    }

    pub fn popover_target_action(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("popoverTargetAction".to_string(), value.clone());
        self.popover_target_action = Some(value);
        self
    }

    pub fn read_only(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("readOnly".to_string(), String::new());
        } else {
            self.attributes.remove("readOnly");
        }
        self.read_only = Some(value);
        self
    }

    pub fn required(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("required".to_string(), String::new());
        } else {
            self.attributes.remove("required");
        }
        self.required = Some(value);
        self
    }

    pub fn role(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("role".to_string(), value.clone());
        self.role = Some(value);
        self
    }

    pub fn selection_direction(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("selectionDirection".to_string(), value.clone());
        self.selection_direction = Some(value);
        self
    }

    pub fn selection_end(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("selectionEnd".to_string(), value.clone());
        self.selection_end = Some(value);
        self
    }

    pub fn selection_start(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("selectionStart".to_string(), value.clone());
        self.selection_start = Some(value);
        self
    }

    pub fn src(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("src".to_string(), value.clone());
        self.src = Some(value);
        self
    }

    pub fn step(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("step".to_string(), value.clone());
        self.step = Some(value);
        self
    }

    pub fn text_content(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("textContent".to_string(), value.clone());
        self.text_content = Some(value);
        self
    }

    pub fn type_(mut self, value: InputType) -> Self {
        self.attributes
            .insert("type".to_string(), value.as_str().to_string());
        self.r#type = Some(value);
        self
    }

    pub fn use_map(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("useMap".to_string(), value.clone());
        self.use_map = Some(value);
        self
    }

    pub fn value(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("value".to_string(), value.clone());
        self.value = Some(value);
        self
    }

    pub fn value_as_date(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("valueAsDate".to_string(), value.clone());
        self.value_as_date = Some(value);
        self
    }

    pub fn virtual_keyboard_policy(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("virtualKeyboardPolicy".to_string(), value.clone());
        self.virtual_keyboard_policy = Some(value);
        self
    }

    pub fn webkitdirectory(mut self, value: bool) -> Self {
        if value {
            self.attributes
                .insert("webkitdirectory".to_string(), String::new());
        } else {
            self.attributes.remove("webkitdirectory");
        }
        self.webkitdirectory = Some(value);
        self
    }

    pub fn writing_suggestions(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes
            .insert("writingSuggestions".to_string(), value.clone());
        self.writing_suggestions = Some(value);
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Input(self),
            children,
        }
    }
}
