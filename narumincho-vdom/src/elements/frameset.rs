// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/frameset
pub struct Frameset {
    ///
    pub cols: std::option::Option<String>,
    ///
    pub rows: std::option::Option<String>,
}

pub fn frameset() -> Frameset {
    Frameset {
        cols: None,
        rows: None,
    }
}
impl Frameset {
    ///
    pub fn cols(mut self, value: impl Into<String>) -> Self {
        self.cols = Some(value.into());
        self
    }

    ///
    pub fn rows(mut self, value: impl Into<String>) -> Self {
        self.rows = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Frameset(self),
            children,
        }
    }
}
