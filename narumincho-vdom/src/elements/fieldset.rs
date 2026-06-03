// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/fieldset
pub struct Fieldset {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub disabled: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub form: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
}

pub fn fieldset() -> Fieldset {
    Fieldset {
        disabled: None,
        form: None,
        name: None,
    }
}
impl Fieldset {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub fn disabled(mut self, value: impl Into<String>) -> Self {
        self.disabled = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub fn form(mut self, value: impl Into<String>) -> Self {
        self.form = Some(value.into());
        self
    }

    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Fieldset(self),
        }
    }
}
