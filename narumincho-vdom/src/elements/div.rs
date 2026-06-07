// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/div
pub struct Div {
    ///
    pub align: std::option::Option<String>,
}

pub fn div() -> Div {
    Div { align: None }
}
impl Div {
    ///
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Div(self),
            children,
        }
    }
}
