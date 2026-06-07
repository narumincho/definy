// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/base
pub struct Base {
    ///
    pub href: std::option::Option<String>,
    ///
    pub target: std::option::Option<String>,
}

pub fn base() -> Base {
    Base {
        href: None,
        target: None,
    }
}
impl Base {
    ///
    pub fn href(mut self, value: impl Into<String>) -> Self {
        self.href = Some(value.into());
        self
    }

    ///
    pub fn target(mut self, value: impl Into<String>) -> Self {
        self.target = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Base(self),
            children,
        }
    }
}
