// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template
pub struct Template {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootclonable
    pub shadowrootclonable: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootcustomelementregistry
    pub shadowrootcustomelementregistry: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootdelegatesfocus
    pub shadowrootdelegatesfocus: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootmode
    pub shadowrootmode: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootreferencetarget
    pub shadowrootreferencetarget: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootserializable
    pub shadowrootserializable: std::option::Option<String>,
    ///
    pub shadowrootslotassignment: std::option::Option<String>,
}

pub fn template() -> Template {
    Template {
        shadowrootclonable: None,
        shadowrootcustomelementregistry: None,
        shadowrootdelegatesfocus: None,
        shadowrootmode: None,
        shadowrootreferencetarget: None,
        shadowrootserializable: None,
        shadowrootslotassignment: None,
    }
}
impl Template {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootclonable
    pub fn shadowrootclonable(mut self, value: impl Into<String>) -> Self {
        self.shadowrootclonable = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootcustomelementregistry
    pub fn shadowrootcustomelementregistry(mut self, value: impl Into<String>) -> Self {
        self.shadowrootcustomelementregistry = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootdelegatesfocus
    pub fn shadowrootdelegatesfocus(mut self, value: impl Into<String>) -> Self {
        self.shadowrootdelegatesfocus = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootmode
    pub fn shadowrootmode(mut self, value: impl Into<String>) -> Self {
        self.shadowrootmode = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootreferencetarget
    pub fn shadowrootreferencetarget(mut self, value: impl Into<String>) -> Self {
        self.shadowrootreferencetarget = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template#shadowrootserializable
    pub fn shadowrootserializable(mut self, value: impl Into<String>) -> Self {
        self.shadowrootserializable = Some(value.into());
        self
    }

    ///
    pub fn shadowrootslotassignment(mut self, value: impl Into<String>) -> Self {
        self.shadowrootslotassignment = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Template(self),
        }
    }
}
