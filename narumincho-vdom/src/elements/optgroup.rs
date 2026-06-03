// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/optgroup
pub struct Optgroup {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub disabled: std::option::Option<String>,
    ///
    pub label: std::option::Option<String>,
}

pub fn optgroup() -> Optgroup {
    Optgroup {
        disabled: None,
        label: None,
    }
}
impl Optgroup {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub fn disabled(mut self, value: impl Into<String>) -> Self {
        self.disabled = Some(value.into());
        self
    }

    ///
    pub fn label(mut self, value: impl Into<String>) -> Self {
        self.label = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Optgroup(self),
        }
    }
}
