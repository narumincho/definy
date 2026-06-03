// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button
pub struct Button {

    /// 
    pub command: std::option::Option<String>,
    /// 
    pub commandfor: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/disabled
    pub disabled: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub form: std::option::Option<String>,
    /// 
    pub formaction: std::option::Option<String>,
    /// 
    pub formenctype: std::option::Option<String>,
    /// 
    pub formmethod: std::option::Option<String>,
    /// 
    pub formnovalidate: std::option::Option<String>,
    /// 
    pub formtarget: std::option::Option<String>,
    /// 
    pub interestfor: std::option::Option<String>,
    /// 
    pub name: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button#popovertarget
    pub popovertarget: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button#popovertargetaction
    pub popovertargetaction: std::option::Option<String>,
    /// 
    pub r#type: std::option::Option<String>,
    /// 
    pub value: std::option::Option<String>,
}


pub fn button() -> Button {
    Button{
        command: None,
        commandfor: None,
        disabled: None,
        form: None,
        formaction: None,
        formenctype: None,
        formmethod: None,
        formnovalidate: None,
        formtarget: None,
        interestfor: None,
        name: None,
        popovertarget: None,
        popovertargetaction: None,
        r#type: None,
        value: None,
    }
}
impl Button {
    /// 
    pub fn command(mut self, value: impl Into<String>) -> Self {
        self.command = Some(value.into());
        self
    }

    /// 
    pub fn commandfor(mut self, value: impl Into<String>) -> Self {
        self.commandfor = Some(value.into());
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
    pub fn formaction(mut self, value: impl Into<String>) -> Self {
        self.formaction = Some(value.into());
        self
    }

    /// 
    pub fn formenctype(mut self, value: impl Into<String>) -> Self {
        self.formenctype = Some(value.into());
        self
    }

    /// 
    pub fn formmethod(mut self, value: impl Into<String>) -> Self {
        self.formmethod = Some(value.into());
        self
    }

    /// 
    pub fn formnovalidate(mut self, value: impl Into<String>) -> Self {
        self.formnovalidate = Some(value.into());
        self
    }

    /// 
    pub fn formtarget(mut self, value: impl Into<String>) -> Self {
        self.formtarget = Some(value.into());
        self
    }

    /// 
    pub fn interestfor(mut self, value: impl Into<String>) -> Self {
        self.interestfor = Some(value.into());
        self
    }

    /// 
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button#popovertarget
    pub fn popovertarget(mut self, value: impl Into<String>) -> Self {
        self.popovertarget = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button#popovertargetaction
    pub fn popovertargetaction(mut self, value: impl Into<String>) -> Self {
        self.popovertargetaction = Some(value.into());
        self
    }

    /// 
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    /// 
    pub fn value(mut self, value: impl Into<String>) -> Self {
        self.value = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Button(self),
        }
    }
}
