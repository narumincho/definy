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
    pub events: Vec<(String, String)>,
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
            element_content: super::ElementContent::Input(self),
            children,
        }
    }
}
