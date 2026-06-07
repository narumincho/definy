// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/track
pub struct Track {
    ///
    pub default: std::option::Option<String>,
    ///
    pub kind: std::option::Option<String>,
    ///
    pub label: std::option::Option<String>,
    ///
    pub src: std::option::Option<String>,
    ///
    pub srclang: std::option::Option<String>,
}

pub fn track() -> Track {
    Track {
        default: None,
        kind: None,
        label: None,
        src: None,
        srclang: None,
    }
}
impl Track {
    ///
    pub fn default(mut self, value: impl Into<String>) -> Self {
        self.default = Some(value.into());
        self
    }

    ///
    pub fn kind(mut self, value: impl Into<String>) -> Self {
        self.kind = Some(value.into());
        self
    }

    ///
    pub fn label(mut self, value: impl Into<String>) -> Self {
        self.label = Some(value.into());
        self
    }

    ///
    pub fn src(mut self, value: impl Into<String>) -> Self {
        self.src = Some(value.into());
        self
    }

    ///
    pub fn srclang(mut self, value: impl Into<String>) -> Self {
        self.srclang = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Track(self),
            children,
        }
    }
}
