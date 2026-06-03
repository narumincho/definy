// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/del
pub struct Del {
    ///
    pub cite: std::option::Option<String>,
    ///
    pub datetime: std::option::Option<String>,
}

pub fn del() -> Del {
    Del {
        cite: None,
        datetime: None,
    }
}
impl Del {
    ///
    pub fn cite(mut self, value: impl Into<String>) -> Self {
        self.cite = Some(value.into());
        self
    }

    ///
    pub fn datetime(mut self, value: impl Into<String>) -> Self {
        self.datetime = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Del(self),
        }
    }
}
