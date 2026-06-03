// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/output
pub struct Output {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/for
    pub r#for: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub form: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
}

pub fn output() -> Output {
    Output {
        r#for: None,
        form: None,
        name: None,
    }
}
impl Output {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/for
    pub fn r#for(mut self, value: impl Into<String>) -> Self {
        self.r#for = Some(value.into());
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
            element_content: super::ElementContent::Output(self),
        }
    }
}
