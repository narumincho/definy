// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// HTML Content Attributes for https://drafts.csswg.org/filter-effects-1/#elementdef-fedropshadow
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct FeDropShadow {
    pub attributes: std::collections::BTreeMap<String, String>,
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
    pub height: std::option::Option<String>,
    pub role: std::option::Option<String>,
    pub text_content: std::option::Option<String>,
    pub width: std::option::Option<String>,
}

/// JavaScript / DOM Properties for https://drafts.csswg.org/filter-effects-1/#elementdef-fedropshadow
#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct FeDropShadowJsProperties {
    pub active_view_transition: std::option::Option<String>,
    pub assigned_slot: std::option::Option<String>,
    pub attribute_style_map: std::option::Option<String>,
    pub attributes: std::option::Option<String>,
    pub base_u_r_i: std::option::Option<String>,
    pub child_nodes: std::option::Option<String>,
    pub children: std::option::Option<String>,
    pub class_list: std::option::Option<String>,
    pub class: std::option::Option<String>,
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
    pub dx: std::option::Option<String>,
    pub dy: std::option::Option<String>,
    pub element_timing: std::option::Option<String>,
    pub first_child: std::option::Option<String>,
    pub first_element_child: std::option::Option<String>,
    pub in1: std::option::Option<String>,
    pub inner_h_t_m_l: std::option::Option<String>,
    pub is_connected: std::option::Option<bool>,
    pub last_child: std::option::Option<String>,
    pub last_element_child: std::option::Option<String>,
    pub local_name: std::option::Option<String>,
    pub long: std::option::Option<String>,
    pub namespace_u_r_i: std::option::Option<String>,
    pub next_element_sibling: std::option::Option<String>,
    pub next_sibling: std::option::Option<String>,
    pub node_name: std::option::Option<String>,
    pub node_value: std::option::Option<String>,
    pub outer_h_t_m_l: std::option::Option<String>,
    pub owner_document: std::option::Option<String>,
    pub owner_s_v_g_element: std::option::Option<String>,
    pub parent_element: std::option::Option<String>,
    pub parent_node: std::option::Option<String>,
    pub prefix: std::option::Option<String>,
    pub previous_element_sibling: std::option::Option<String>,
    pub previous_sibling: std::option::Option<String>,
    pub region_overset: std::option::Option<String>,
    pub result: std::option::Option<String>,
    pub scroll_height: std::option::Option<String>,
    pub scroll_width: std::option::Option<String>,
    pub shadow_root: std::option::Option<String>,
    pub short: std::option::Option<String>,
    pub std_deviation_x: std::option::Option<String>,
    pub std_deviation_y: std::option::Option<String>,
    pub tag_name: std::option::Option<String>,
    pub viewport_element: std::option::Option<String>,
    pub x: std::option::Option<String>,
    pub y: std::option::Option<String>,
}

pub fn feDropShadow() -> FeDropShadow {
    FeDropShadow::default()
}

impl FeDropShadow {
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
            element_content: super::ElementContent::FeDropShadow(self),
            children: Vec::new(),
        })
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

    pub fn height(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("height".to_string(), value.clone());
        self.height = Some(value);
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

    pub fn width(mut self, value: impl Into<String>) -> Self {
        let value = value.into();
        self.attributes.insert("width".to_string(), value.clone());
        self.width = Some(value);
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::FeDropShadow(self),
            children,
        }
    }
}
