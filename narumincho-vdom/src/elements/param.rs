// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/param
pub struct Param {
    ///
    pub name: std::option::Option<String>,
    ///
    pub r#type: std::option::Option<String>,
    ///
    pub value: std::option::Option<String>,
    ///
    pub valuetype: std::option::Option<String>,
}

pub fn param() -> Param {
    Param {
        name: None,
        r#type: None,
        value: None,
        valuetype: None,
    }
}
impl Param {
    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
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

    ///
    pub fn valuetype(mut self, value: impl Into<String>) -> Self {
        self.valuetype = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Param(self),
        }
    }
}
