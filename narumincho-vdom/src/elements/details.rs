// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// HTML Content Attributes for https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct Details {
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
    pub class_name: std::option::Option<String>,
    pub name: std::option::Option<String>,
    pub open: std::option::Option<bool>,
    pub role: std::option::Option<String>,
    pub text_content: std::option::Option<String>,
    pub virtual_keyboard_policy: std::option::Option<String>,
    pub writing_suggestions: std::option::Option<String>,
}

/// JavaScript / DOM Properties for https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct DetailsJsProperties {
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
    pub heading_reset: std::option::Option<bool>,
    pub inner_h_t_m_l: std::option::Option<String>,
    pub inner_text: std::option::Option<String>,
    pub is_connected: std::option::Option<bool>,
    pub is_content_editable: std::option::Option<bool>,
    pub last_child: std::option::Option<String>,
    pub last_element_child: std::option::Option<String>,
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
}

pub fn details() -> Details {
    Details::default()
}

impl Details {
    pub fn aria_active_descendant_element(mut self, value: impl Into<String>) -> Self {
        self.aria_active_descendant_element = Some(value.into());
        self
    }

    pub fn aria_atomic(mut self, value: impl Into<String>) -> Self {
        self.aria_atomic = Some(value.into());
        self
    }

    pub fn aria_auto_complete(mut self, value: impl Into<String>) -> Self {
        self.aria_auto_complete = Some(value.into());
        self
    }

    pub fn aria_braille_label(mut self, value: impl Into<String>) -> Self {
        self.aria_braille_label = Some(value.into());
        self
    }

    pub fn aria_braille_role_description(mut self, value: impl Into<String>) -> Self {
        self.aria_braille_role_description = Some(value.into());
        self
    }

    pub fn aria_busy(mut self, value: impl Into<String>) -> Self {
        self.aria_busy = Some(value.into());
        self
    }

    pub fn aria_checked(mut self, value: impl Into<String>) -> Self {
        self.aria_checked = Some(value.into());
        self
    }

    pub fn aria_col_count(mut self, value: impl Into<String>) -> Self {
        self.aria_col_count = Some(value.into());
        self
    }

    pub fn aria_col_index(mut self, value: impl Into<String>) -> Self {
        self.aria_col_index = Some(value.into());
        self
    }

    pub fn aria_col_index_text(mut self, value: impl Into<String>) -> Self {
        self.aria_col_index_text = Some(value.into());
        self
    }

    pub fn aria_col_span(mut self, value: impl Into<String>) -> Self {
        self.aria_col_span = Some(value.into());
        self
    }

    pub fn aria_current(mut self, value: impl Into<String>) -> Self {
        self.aria_current = Some(value.into());
        self
    }

    pub fn aria_description(mut self, value: impl Into<String>) -> Self {
        self.aria_description = Some(value.into());
        self
    }

    pub fn aria_disabled(mut self, value: impl Into<String>) -> Self {
        self.aria_disabled = Some(value.into());
        self
    }

    pub fn aria_expanded(mut self, value: impl Into<String>) -> Self {
        self.aria_expanded = Some(value.into());
        self
    }

    pub fn aria_has_popup(mut self, value: impl Into<String>) -> Self {
        self.aria_has_popup = Some(value.into());
        self
    }

    pub fn aria_hidden(mut self, value: impl Into<String>) -> Self {
        self.aria_hidden = Some(value.into());
        self
    }

    pub fn aria_invalid(mut self, value: impl Into<String>) -> Self {
        self.aria_invalid = Some(value.into());
        self
    }

    pub fn aria_key_shortcuts(mut self, value: impl Into<String>) -> Self {
        self.aria_key_shortcuts = Some(value.into());
        self
    }

    pub fn aria_label(mut self, value: impl Into<String>) -> Self {
        self.aria_label = Some(value.into());
        self
    }

    pub fn aria_level(mut self, value: impl Into<String>) -> Self {
        self.aria_level = Some(value.into());
        self
    }

    pub fn aria_live(mut self, value: impl Into<String>) -> Self {
        self.aria_live = Some(value.into());
        self
    }

    pub fn aria_modal(mut self, value: impl Into<String>) -> Self {
        self.aria_modal = Some(value.into());
        self
    }

    pub fn aria_multi_line(mut self, value: impl Into<String>) -> Self {
        self.aria_multi_line = Some(value.into());
        self
    }

    pub fn aria_multi_selectable(mut self, value: impl Into<String>) -> Self {
        self.aria_multi_selectable = Some(value.into());
        self
    }

    pub fn aria_orientation(mut self, value: impl Into<String>) -> Self {
        self.aria_orientation = Some(value.into());
        self
    }

    pub fn aria_placeholder(mut self, value: impl Into<String>) -> Self {
        self.aria_placeholder = Some(value.into());
        self
    }

    pub fn aria_pos_in_set(mut self, value: impl Into<String>) -> Self {
        self.aria_pos_in_set = Some(value.into());
        self
    }

    pub fn aria_pressed(mut self, value: impl Into<String>) -> Self {
        self.aria_pressed = Some(value.into());
        self
    }

    pub fn aria_read_only(mut self, value: impl Into<String>) -> Self {
        self.aria_read_only = Some(value.into());
        self
    }

    pub fn aria_relevant(mut self, value: impl Into<String>) -> Self {
        self.aria_relevant = Some(value.into());
        self
    }

    pub fn aria_required(mut self, value: impl Into<String>) -> Self {
        self.aria_required = Some(value.into());
        self
    }

    pub fn aria_role_description(mut self, value: impl Into<String>) -> Self {
        self.aria_role_description = Some(value.into());
        self
    }

    pub fn aria_row_count(mut self, value: impl Into<String>) -> Self {
        self.aria_row_count = Some(value.into());
        self
    }

    pub fn aria_row_index(mut self, value: impl Into<String>) -> Self {
        self.aria_row_index = Some(value.into());
        self
    }

    pub fn aria_row_index_text(mut self, value: impl Into<String>) -> Self {
        self.aria_row_index_text = Some(value.into());
        self
    }

    pub fn aria_row_span(mut self, value: impl Into<String>) -> Self {
        self.aria_row_span = Some(value.into());
        self
    }

    pub fn aria_selected(mut self, value: impl Into<String>) -> Self {
        self.aria_selected = Some(value.into());
        self
    }

    pub fn aria_set_size(mut self, value: impl Into<String>) -> Self {
        self.aria_set_size = Some(value.into());
        self
    }

    pub fn aria_sort(mut self, value: impl Into<String>) -> Self {
        self.aria_sort = Some(value.into());
        self
    }

    pub fn aria_value_max(mut self, value: impl Into<String>) -> Self {
        self.aria_value_max = Some(value.into());
        self
    }

    pub fn aria_value_min(mut self, value: impl Into<String>) -> Self {
        self.aria_value_min = Some(value.into());
        self
    }

    pub fn aria_value_now(mut self, value: impl Into<String>) -> Self {
        self.aria_value_now = Some(value.into());
        self
    }

    pub fn aria_value_text(mut self, value: impl Into<String>) -> Self {
        self.aria_value_text = Some(value.into());
        self
    }

    pub fn autocorrect(mut self, value: bool) -> Self {
        self.autocorrect = Some(value);
        self
    }

    pub fn class_name(mut self, value: impl Into<String>) -> Self {
        self.class_name = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn open(mut self, value: bool) -> Self {
        self.open = Some(value);
        self
    }

    pub fn role(mut self, value: impl Into<String>) -> Self {
        self.role = Some(value.into());
        self
    }

    pub fn text_content(mut self, value: impl Into<String>) -> Self {
        self.text_content = Some(value.into());
        self
    }

    pub fn virtual_keyboard_policy(mut self, value: impl Into<String>) -> Self {
        self.virtual_keyboard_policy = Some(value.into());
        self
    }

    pub fn writing_suggestions(mut self, value: impl Into<String>) -> Self {
        self.writing_suggestions = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Details(self),
            children,
        }
    }
}
