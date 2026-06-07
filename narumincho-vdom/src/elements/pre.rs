// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/pre
pub struct Pre {
    ///
    pub width: std::option::Option<String>,
}

pub fn pre() -> Pre {
    Pre { width: None }
}
impl Pre {
    ///
    pub fn width(mut self, value: impl Into<String>) -> Self {
        self.width = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Pre(self),
            children,
        }
    }
}
