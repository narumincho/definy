// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/select
pub struct Select {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/select#autocomplete
    pub autocomplete: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub disabled: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub form: std::option::Option<String>,
    ///
    pub hr_in_select: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/multiple
    pub multiple: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/required
    pub required: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/size
    pub size: std::option::Option<String>,
}

pub fn select() -> Select {
    Select {
        autocomplete: None,
        disabled: None,
        form: None,
        hr_in_select: None,
        multiple: None,
        name: None,
        required: None,
        size: None,
    }
}
impl Select {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/select#autocomplete
    pub fn autocomplete(mut self, value: impl Into<String>) -> Self {
        self.autocomplete = Some(value.into());
        self
    }

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
    pub fn hr_in_select(mut self, value: impl Into<String>) -> Self {
        self.hr_in_select = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/multiple
    pub fn multiple(mut self, value: impl Into<String>) -> Self {
        self.multiple = Some(value.into());
        self
    }

    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/required
    pub fn required(mut self, value: impl Into<String>) -> Self {
        self.required = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/size
    pub fn size(mut self, value: impl Into<String>) -> Self {
        self.size = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Select(self),
            children,
        }
    }
}
