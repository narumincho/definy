// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/summary
pub struct Summary {
    ///
    pub display_list_item: std::option::Option<String>,
}

pub fn summary() -> Summary {
    Summary {
        display_list_item: None,
    }
}
impl Summary {
    ///
    pub fn display_list_item(mut self, value: impl Into<String>) -> Self {
        self.display_list_item = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Summary(self),
            children,
        }
    }
}
