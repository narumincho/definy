// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/textarea
pub struct Textarea {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/autocomplete
    pub autocomplete: std::option::Option<String>,
    ///
    pub cols: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/dirname
    pub dirname: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub disabled: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub form: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/maxlength
    pub maxlength: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/minlength
    pub minlength: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/placeholder
    pub placeholder: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/readonly
    pub readonly: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/required
    pub required: std::option::Option<String>,
    ///
    pub rows: std::option::Option<String>,
    ///
    pub wrap: std::option::Option<String>,
}

pub fn textarea() -> Textarea {
    Textarea {
        autocomplete: None,
        cols: None,
        dirname: None,
        disabled: None,
        form: None,
        maxlength: None,
        minlength: None,
        name: None,
        placeholder: None,
        readonly: None,
        required: None,
        rows: None,
        wrap: None,
    }
}
impl Textarea {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/autocomplete
    pub fn autocomplete(mut self, value: impl Into<String>) -> Self {
        self.autocomplete = Some(value.into());
        self
    }

    ///
    pub fn cols(mut self, value: impl Into<String>) -> Self {
        self.cols = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/dirname
    pub fn dirname(mut self, value: impl Into<String>) -> Self {
        self.dirname = Some(value.into());
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

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/maxlength
    pub fn maxlength(mut self, value: impl Into<String>) -> Self {
        self.maxlength = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/minlength
    pub fn minlength(mut self, value: impl Into<String>) -> Self {
        self.minlength = Some(value.into());
        self
    }

    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/placeholder
    pub fn placeholder(mut self, value: impl Into<String>) -> Self {
        self.placeholder = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/readonly
    pub fn readonly(mut self, value: impl Into<String>) -> Self {
        self.readonly = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/required
    pub fn required(mut self, value: impl Into<String>) -> Self {
        self.required = Some(value.into());
        self
    }

    ///
    pub fn rows(mut self, value: impl Into<String>) -> Self {
        self.rows = Some(value.into());
        self
    }

    ///
    pub fn wrap(mut self, value: impl Into<String>) -> Self {
        self.wrap = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Textarea(self),
        }
    }
}
