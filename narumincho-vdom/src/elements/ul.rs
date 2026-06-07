// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/ul
pub struct Ul {
    ///
    pub compact: std::option::Option<String>,
    ///
    pub r#type: std::option::Option<String>,
}

pub fn ul() -> Ul {
    Ul {
        compact: None,
        r#type: None,
    }
}
impl Ul {
    ///
    pub fn compact(mut self, value: impl Into<String>) -> Self {
        self.compact = Some(value.into());
        self
    }

    ///
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Ul(self),
            children,
        }
    }
}
