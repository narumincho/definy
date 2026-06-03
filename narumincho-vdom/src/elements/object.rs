// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/object
pub struct Object {
    ///
    pub archive: std::option::Option<String>,
    ///
    pub border: std::option::Option<String>,
    ///
    pub classid: std::option::Option<String>,
    ///
    pub codebase: std::option::Option<String>,
    ///
    pub codetype: std::option::Option<String>,
    ///
    pub data: std::option::Option<String>,
    ///
    pub declare: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub form: std::option::Option<String>,
    ///
    pub height: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
    ///
    pub standby: std::option::Option<String>,
    ///
    pub r#type: std::option::Option<String>,
    ///
    pub usemap: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn object() -> Object {
    Object {
        archive: None,
        border: None,
        classid: None,
        codebase: None,
        codetype: None,
        data: None,
        declare: None,
        form: None,
        height: None,
        name: None,
        standby: None,
        r#type: None,
        usemap: None,
        width: None,
    }
}
impl Object {
    ///
    pub fn archive(mut self, value: impl Into<String>) -> Self {
        self.archive = Some(value.into());
        self
    }

    ///
    pub fn border(mut self, value: impl Into<String>) -> Self {
        self.border = Some(value.into());
        self
    }

    ///
    pub fn classid(mut self, value: impl Into<String>) -> Self {
        self.classid = Some(value.into());
        self
    }

    ///
    pub fn codebase(mut self, value: impl Into<String>) -> Self {
        self.codebase = Some(value.into());
        self
    }

    ///
    pub fn codetype(mut self, value: impl Into<String>) -> Self {
        self.codetype = Some(value.into());
        self
    }

    ///
    pub fn data(mut self, value: impl Into<String>) -> Self {
        self.data = Some(value.into());
        self
    }

    ///
    pub fn declare(mut self, value: impl Into<String>) -> Self {
        self.declare = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/form
    pub fn form(mut self, value: impl Into<String>) -> Self {
        self.form = Some(value.into());
        self
    }

    ///
    pub fn height(mut self, value: impl Into<String>) -> Self {
        self.height = Some(value.into());
        self
    }

    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    ///
    pub fn standby(mut self, value: impl Into<String>) -> Self {
        self.standby = Some(value.into());
        self
    }

    ///
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    ///
    pub fn usemap(mut self, value: impl Into<String>) -> Self {
        self.usemap = Some(value.into());
        self
    }

    ///
    pub fn width(mut self, value: impl Into<String>) -> Self {
        self.width = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Object(self),
        }
    }
}
