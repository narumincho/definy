// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/label
pub struct Label {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/for
    pub r#for: std::option::Option<String>,
}

pub fn label() -> Label {
    Label { r#for: None }
}
impl Label {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/for
    pub fn r#for(mut self, value: impl Into<String>) -> Self {
        self.r#for = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Label(self),
            children,
        }
    }
}
