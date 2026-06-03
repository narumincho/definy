// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/html
pub struct Html {
    ///
    pub version: std::option::Option<String>,
    ///
    pub xmlns: std::option::Option<String>,
}

pub fn html() -> Html {
    Html {
        version: None,
        xmlns: None,
    }
}
impl Html {
    ///
    pub fn version(mut self, value: impl Into<String>) -> Self {
        self.version = Some(value.into());
        self
    }

    ///
    pub fn xmlns(mut self, value: impl Into<String>) -> Self {
        self.xmlns = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Html(self),
        }
    }
}
