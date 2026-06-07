// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dir
pub struct Dir {
    ///
    pub compact: std::option::Option<String>,
}

pub fn dir() -> Dir {
    Dir { compact: None }
}
impl Dir {
    ///
    pub fn compact(mut self, value: impl Into<String>) -> Self {
        self.compact = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Dir(self),
            children,
        }
    }
}
