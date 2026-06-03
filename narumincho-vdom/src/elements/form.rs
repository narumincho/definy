// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/form
pub struct Form {

    /// 
    pub accept_charset: std::option::Option<String>,
    /// 
    pub action: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/autocomplete
    pub autocomplete: std::option::Option<String>,
    /// 
    pub enctype: std::option::Option<String>,
    /// 
    pub method: std::option::Option<String>,
    /// 
    pub name: std::option::Option<String>,
    /// 
    pub novalidate: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/rel
    pub rel: std::option::Option<String>,
    /// 
    pub target: std::option::Option<String>,
}


pub fn form() -> Form {
    Form{
        accept_charset: None,
        action: None,
        autocomplete: None,
        enctype: None,
        method: None,
        name: None,
        novalidate: None,
        rel: None,
        target: None,
    }
}
impl Form {
    /// 
    pub fn accept_charset(mut self, value: impl Into<String>) -> Self {
        self.accept_charset = Some(value.into());
        self
    }

    /// 
    pub fn action(mut self, value: impl Into<String>) -> Self {
        self.action = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/autocomplete
    pub fn autocomplete(mut self, value: impl Into<String>) -> Self {
        self.autocomplete = Some(value.into());
        self
    }

    /// 
    pub fn enctype(mut self, value: impl Into<String>) -> Self {
        self.enctype = Some(value.into());
        self
    }

    /// 
    pub fn method(mut self, value: impl Into<String>) -> Self {
        self.method = Some(value.into());
        self
    }

    /// 
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// 
    pub fn novalidate(mut self, value: impl Into<String>) -> Self {
        self.novalidate = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/rel
    pub fn rel(mut self, value: impl Into<String>) -> Self {
        self.rel = Some(value.into());
        self
    }

    /// 
    pub fn target(mut self, value: impl Into<String>) -> Self {
        self.target = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Form(self),
        }
    }
}
